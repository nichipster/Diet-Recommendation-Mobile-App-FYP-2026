from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import user, UserRole, nutrition_content, NutritionContentType

router = APIRouter(prefix="/content", tags=["Nutrition Content"])


def sg_now() -> datetime:
    return datetime.now(ZoneInfo("Asia/Singapore"))


def get_current_db_user(db: db_dependency, current_user: user_dependency) -> user:
    if current_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    db_user = db.exec(select(user).where(user.user_id == int(current_user["id"]))).first()
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user


def author_name(db: db_dependency, author_id: int) -> str:
    author = db.exec(select(user).where(user.user_id == author_id)).first()
    if author is None:
        return "Nutritionist"
    return f"{author.first_name} {author.last_name}".strip()


class ArticleResponse(BaseModel):
    id: str
    title: str
    preview: str
    content: str
    date: str
    author: str
    category: str
    views: int


class TipResponse(BaseModel):
    id: str
    text: str
    author: str
    views: int


class AdviceResponse(BaseModel):
    id: str
    title: str
    desc: str
    author: str
    views: int


class ContentCreateRequest(BaseModel):
    title: str | None = None
    preview: str | None = None
    content: str
    category: str | None = None


class TipCreateRequest(BaseModel):
    text: str
    author: str | None = None


class AdviceCreateRequest(BaseModel):
    title: str
    desc: str
    author: str | None = None


class ContentUpdateRequest(BaseModel):
    title: str | None = None
    preview: str | None = None
    content: str | None = None
    category: str | None = None
    text: str | None = None
    desc: str | None = None
    

def format_date(dt: datetime) -> str:
    return dt.strftime("%a, %d %b %Y")


def require_nutritionist(db_user: user) -> None:
    if db_user.role not in {UserRole.nutritionist, UserRole.admin}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Nutritionist access required")


@router.get("/articles", response_model=list[ArticleResponse], status_code=status.HTTP_200_OK)
async def get_articles(db: db_dependency, current_user: user_dependency):
    get_current_db_user(db, current_user)
    items = db.exec(
        select(nutrition_content)
        .where(nutrition_content.content_type == NutritionContentType.article)
        .order_by(nutrition_content.created_at.desc())
    ).all()
    return [
        ArticleResponse(
            id=str(item.content_id),
            title=item.title or "Untitled",
            preview=item.preview or "",
            content=item.body,
            date=format_date(item.created_at),
            author=author_name(db, item.author_id),
            category=item.category or "General",
            views=item.views,
        )
        for item in items
    ]


@router.get("/tips", response_model=list[TipResponse], status_code=status.HTTP_200_OK)
async def get_tips(db: db_dependency, current_user: user_dependency):
    get_current_db_user(db, current_user)
    items = db.exec(
        select(nutrition_content)
        .where(nutrition_content.content_type == NutritionContentType.tip)
        .order_by(nutrition_content.created_at.desc())
    ).all()
    return [TipResponse(id=str(item.content_id), text=item.body, author=author_name(db, item.author_id), views=item.views) for item in items]


@router.get("/advice", response_model=list[AdviceResponse], status_code=status.HTTP_200_OK)
async def get_advice(db: db_dependency, current_user: user_dependency):
    get_current_db_user(db, current_user)
    items = db.exec(
        select(nutrition_content)
        .where(nutrition_content.content_type == NutritionContentType.advice)
        .order_by(nutrition_content.created_at.desc())
    ).all()
    return [
        AdviceResponse(
            id=str(item.content_id),
            title=item.title or "Untitled",
            desc=item.preview or item.body,
            author=author_name(db, item.author_id),
            views=item.views,
        )
        for item in items
    ]


@router.patch("/articles/{content_id}/view", response_model=ArticleResponse, status_code=status.HTTP_200_OK)
async def increment_article_view(content_id: int, db: db_dependency, current_user: user_dependency):
    get_current_db_user(db, current_user)
    item = db.exec(
        select(nutrition_content).where(
            nutrition_content.content_id == content_id,
            nutrition_content.content_type == NutritionContentType.article,
        )
    ).first()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    item.views += 1
    item.updated_at = sg_now()
    try:
        db.add(item)
        db.commit()
        db.refresh(item)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return ArticleResponse(
        id=str(item.content_id),
        title=item.title or "Untitled",
        preview=item.preview or "",
        content=item.body,
        date=format_date(item.created_at),
        author=author_name(db, item.author_id),
        category=item.category or "General",
        views=item.views,
    )


# ─── Delete ──────────────────────────────────────────────────────────────────


@router.delete("/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_content(content_id: int, db: db_dependency, current_user: user_dependency):
    """Delete a piece of nutrition content by ID.

    Args:
        content_id (int): ID of the content item to delete.
        db (db_dependency): Database session.
        current_user (user_dependency): Authenticated user (must be author or admin).
    """
    db_user = get_current_db_user(db, current_user)
    item = db.exec(
        select(nutrition_content).where(nutrition_content.content_id == content_id)
    ).first()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    if db_user.role != UserRole.admin and item.author_id != db_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    try:
        db.delete(item)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ─── Update ──────────────────────────────────────────────────────────────────

@router.patch("/{content_id}", status_code=status.HTTP_200_OK)
async def update_content(
    content_id: int,
    request: ContentUpdateRequest,
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)

    item = db.exec(
        select(nutrition_content).where(nutrition_content.content_id == content_id)
    ).first()

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found"
        )

    if db_user.role != UserRole.admin and item.author_id != db_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    if item.content_type == NutritionContentType.article:
        if request.title is not None:
            item.title = request.title.strip()
        if request.preview is not None:
            item.preview = request.preview.strip()
        if request.content is not None:
            item.body = request.content.strip()
        if request.category is not None:
            item.category = request.category.strip()

    elif item.content_type == NutritionContentType.tip:
        if request.text is not None:
            item.body = request.text.strip()
        elif request.content is not None:
            item.body = request.content.strip()

    elif item.content_type == NutritionContentType.advice:
        if request.title is not None:
            item.title = request.title.strip()
        if request.desc is not None:
            item.preview = request.desc.strip()
            item.body = request.desc.strip()
        elif request.content is not None:
            item.preview = request.content.strip()
            item.body = request.content.strip()

    item.updated_at = sg_now()

    try:
        db.add(item)
        db.commit()
        db.refresh(item)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    if item.content_type == NutritionContentType.article:
        return ArticleResponse(
            id=str(item.content_id),
            title=item.title or "Untitled",
            preview=item.preview or "",
            content=item.body,
            date=format_date(item.created_at),
            author=author_name(db, item.author_id),
            category=item.category or "General",
            views=item.views,
        )

    if item.content_type == NutritionContentType.tip:
        return TipResponse(
            id=str(item.content_id),
            text=item.body,
            author=author_name(db, item.author_id),
            views=item.views,
        )

    return AdviceResponse(
        id=str(item.content_id),
        title=item.title or "Untitled",
        desc=item.preview or item.body,
        author=author_name(db, item.author_id),
        views=item.views,
    )


# ─── View increments ──────────────────────────────────────────────────────────


@router.patch("/tips/{content_id}/view", response_model=TipResponse, status_code=status.HTTP_200_OK)
async def increment_tip_view(content_id: int, db: db_dependency, current_user: user_dependency):
    """Increment the view count for a tip.

    Args:
        content_id (int): ID of the tip.
        db (db_dependency): Database session.
        current_user (user_dependency): Authenticated user.

    Returns:
        TipResponse: Updated tip with incremented view count.
    """
    get_current_db_user(db, current_user)
    item = db.exec(
        select(nutrition_content).where(
            nutrition_content.content_id == content_id,
            nutrition_content.content_type == NutritionContentType.tip,
        )
    ).first()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tip not found")
    item.views += 1
    item.updated_at = sg_now()
    try:
        db.add(item)
        db.commit()
        db.refresh(item)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return TipResponse(id=str(item.content_id), text=item.body, author=author_name(db, item.author_id), views=item.views)


@router.patch("/advice/{content_id}/view", response_model=AdviceResponse, status_code=status.HTTP_200_OK)
async def increment_advice_view(content_id: int, db: db_dependency, current_user: user_dependency):
    """Increment the view count for an advice item.

    Args:
        content_id (int): ID of the advice.
        db (db_dependency): Database session.
        current_user (user_dependency): Authenticated user.

    Returns:
        AdviceResponse: Updated advice with incremented view count.
    """
    get_current_db_user(db, current_user)
    item = db.exec(
        select(nutrition_content).where(
            nutrition_content.content_id == content_id,
            nutrition_content.content_type == NutritionContentType.advice,
        )
    ).first()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Advice not found")
    item.views += 1
    item.updated_at = sg_now()
    try:
        db.add(item)
        db.commit()
        db.refresh(item)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return AdviceResponse(
        id=str(item.content_id),
        title=item.title or "Untitled",
        desc=item.preview or item.body,
        author=author_name(db, item.author_id),
        views=item.views,
    )


# Optional create endpoints for NutritionistContent.tsx integration later.
@router.post("/articles", response_model=ArticleResponse, status_code=status.HTTP_201_CREATED)
async def create_article(request: ContentCreateRequest, db: db_dependency, current_user: user_dependency):
    db_user = get_current_db_user(db, current_user)
    require_nutritionist(db_user)
    item = nutrition_content(
        author_id=db_user.user_id,
        content_type=NutritionContentType.article,
        title=request.title,
        preview=request.preview,
        body=request.content,
        category=request.category,
    )
    try:
        db.add(item)
        db.commit()
        db.refresh(item)
        return ArticleResponse(
            id=str(item.content_id), title=item.title or "Untitled", preview=item.preview or "", content=item.body,
            date=format_date(item.created_at), author=author_name(db, item.author_id), category=item.category or "General", views=item.views
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/tips", response_model=TipResponse, status_code=status.HTTP_201_CREATED)
async def create_tip(
    request: TipCreateRequest,
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)
    require_nutritionist(db_user)

    item = nutrition_content(
        author_id=db_user.user_id,
        content_type=NutritionContentType.tip,
        title=None,
        preview=None,
        body=request.text.strip(),
        category=None,
        views=0,
    )

    try:
        db.add(item)
        db.commit()
        db.refresh(item)

        return TipResponse(
            id=str(item.content_id),
            text=item.body,
            author=request.author.strip() if request.author else author_name(db, item.author_id),
            views=item.views,
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    

@router.post("/advice", response_model=AdviceResponse, status_code=status.HTTP_201_CREATED)
async def create_advice(
    request: AdviceCreateRequest,
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)
    require_nutritionist(db_user)

    item = nutrition_content(
        author_id=db_user.user_id,
        content_type=NutritionContentType.advice,
        title=request.title.strip(),
        preview=request.desc.strip(),
        body=request.desc.strip(),
        category=None,
        views=0,
    )

    try:
        db.add(item)
        db.commit()
        db.refresh(item)

        return AdviceResponse(
            id=str(item.content_id),
            title=item.title or "Untitled",
            desc=item.preview or item.body,
            author=request.author.strip() if request.author else author_name(db, item.author_id),
            views=item.views,
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

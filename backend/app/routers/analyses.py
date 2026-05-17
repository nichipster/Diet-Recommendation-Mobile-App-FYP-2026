from datetime import datetime, date
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import user, UserRole, analysis

router = APIRouter(prefix="/analyses", tags=["Analyses"])


def sg_now() -> datetime:
    return datetime.now(ZoneInfo("Asia/Singapore"))


def get_current_db_user(db: db_dependency, current_user: user_dependency) -> user:
    if current_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    db_user = db.exec(select(user).where(user.user_id == int(current_user["id"]))).first()
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user


class AnalysisRequest(BaseModel):
    clientId: int
    nutritionistName: str
    userName: str
    summary: str
    wentWell: str
    areasToImprove: str
    recommendations: str
    nextSteps: str


class AnalysisResponse(BaseModel):
    id: str
    clientId: int | None = None
    nutritionistName: str
    userName: str
    lastUpdated: str
    summary: str
    wentWell: str
    areasToImprove: str
    recommendations: str
    nextSteps: str


def build_analysis_response(item: analysis) -> AnalysisResponse:
    return AnalysisResponse(
        id=str(item.analysis_id),
        clientId=item.client_id,
        nutritionistName=item.nutritionist_name,
        userName=item.user_name,
        lastUpdated=item.last_updated.isoformat(),
        summary=item.summary,
        wentWell=item.went_well,
        areasToImprove=item.areas_to_improve,
        recommendations=item.recommendations,
        nextSteps=item.next_steps,
    )


@router.get("", response_model=list[AnalysisResponse], status_code=status.HTTP_200_OK)
async def get_analyses(db: db_dependency, current_user: user_dependency):
    db_user = get_current_db_user(db, current_user)

    stmt = select(analysis).order_by(analysis.last_updated.desc())
    if db_user.role == UserRole.nutritionist:
        stmt = stmt.where(analysis.nutritionist_id == db_user.user_id)
    elif db_user.role != UserRole.admin:
        stmt = stmt.where(analysis.client_id == db_user.user_id)

    items = db.exec(stmt).all()
    return [build_analysis_response(item) for item in items]


@router.post("", response_model=AnalysisResponse, status_code=status.HTTP_200_OK)
async def upsert_analysis(request: AnalysisRequest, db: db_dependency, current_user: user_dependency):
    db_user = get_current_db_user(db, current_user)
    if db_user.role not in {UserRole.nutritionist, UserRole.admin}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Nutritionist access required")

    today = sg_now().date()
    existing = db.exec(select(analysis).where(analysis.client_id == request.clientId, analysis.nutritionist_id == db_user.user_id,)).first()

    # Try to infer client_id from the id format: "nutritionistId_userName" cannot safely identify DB user.
    # It is kept nullable for frontend compatibility.
    if existing is None:
        item = analysis(
            nutritionist_id=db_user.user_id,
            client_id=request.clientId,
            nutritionist_name=request.nutritionistName,
            user_name=request.userName,
            summary=request.summary,
            went_well=request.wentWell,
            areas_to_improve=request.areasToImprove,
            recommendations=request.recommendations,
            next_steps=request.nextSteps,
            last_updated=today,
        )
    else:
        if db_user.role != UserRole.admin and existing.nutritionist_id != db_user.user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Analysis access denied")
        item = existing
        item.nutritionist_name = request.nutritionistName
        item.client_id = request.clientId
        item.user_name = request.userName
        item.summary = request.summary
        item.went_well = request.wentWell
        item.areas_to_improve = request.areasToImprove
        item.recommendations = request.recommendations
        item.next_steps = request.nextSteps
        item.last_updated = today
        item.updated_at = sg_now()

    try:
        db.add(item)
        db.commit()
        db.refresh(item)
        return build_analysis_response(item)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

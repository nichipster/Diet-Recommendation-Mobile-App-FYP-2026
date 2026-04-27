import resend
from ..dependencies import RESEND_API_KEY

resend.api_key = RESEND_API_KEY

def send_verification_email(to_email: str, code: str):
    resend.Emails.send({
        "from": "onboarding@resend.dev",
        "to": to_email,
        "subject": "Your verification code",
        "html": f"""
            <h2>Verify your email</h2>
            <p>Your 6-digit verification code is:</p>
            <h1 style="letter-spacing: 8px;">{code}</h1>
            <p>This code expires in 10 minutes.</p>
        """
    })
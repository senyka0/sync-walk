from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.deps import get_optional_current_user
from app.models.user import User
from app.schemas.feedback import FeedbackRequest, FeedbackResponse
from app.services.feedback import FeedbackDeliveryError, deliver_feedback

router = APIRouter()


def _get_client_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for
    return request.client.host if request.client else None


@router.post("", response_model=FeedbackResponse)
async def submit(
    payload: FeedbackRequest,
    request: Request,
    user: User | None = Depends(get_optional_current_user),
):
    try:
        await deliver_feedback(payload, user, _get_client_ip(request))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except FeedbackDeliveryError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return FeedbackResponse(ok=True)

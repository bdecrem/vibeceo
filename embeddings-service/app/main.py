from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
from app.embeddings import get_embeddings, EmbeddingModel
from app.config import Settings, get_settings

app = FastAPI(
    title="Embeddings Service",
    description="A service for generating embeddings using all-MiniLM-L6-v2",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class EmbeddingRequest(BaseModel):
    texts: List[str]
    normalize: Optional[bool] = True

class EmbeddingResponse(BaseModel):
    embeddings: List[List[float]]
    model: str
    dimension: int

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.post("/embeddings", response_model=EmbeddingResponse)
async def create_embeddings(
    request: EmbeddingRequest,
    settings: Settings = Depends(get_settings)
):
    """
    Generate embeddings for a list of texts using all-MiniLM-L6-v2
    """
    try:
        if not request.texts:
            raise HTTPException(status_code=400, detail="No texts provided")
        
        if len(request.texts) > settings.max_batch_size:
            raise HTTPException(
                status_code=400,
                detail=f"Batch size exceeds maximum of {settings.max_batch_size}"
            )

        embeddings = get_embeddings(
            texts=request.texts,
            normalize=request.normalize
        )

        return EmbeddingResponse(
            embeddings=embeddings.tolist(),
            model=settings.model_name,
            dimension=settings.embedding_dimension
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    ) 
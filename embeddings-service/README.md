# Embeddings Service

A FastAPI service for generating embeddings using the all-MiniLM-L6-v2 model.

## Features

- Fast and efficient embedding generation
- Batch processing support
- GPU acceleration when available
- Health check endpoint
- Configurable batch size and rate limiting
- CORS support for web applications

## Setup

### Local Development

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Copy the example environment file:
```bash
cp .env.local.example .env.local
```

4. Run the service:
```bash
uvicorn app.main:app --reload
```

Or use the provided start script:
```bash
chmod +x start.sh
./start.sh
```

The service will be available at `http://localhost:8000`

### API Documentation

Once running, you can access:
- Interactive API docs: `http://localhost:8000/docs`
- ReDoc documentation: `http://localhost:8000/redoc`

## API Endpoints

### POST /embeddings
Generate embeddings for a list of texts.

**Request body:**
```json
{
    "texts": ["Your text here", "Another text"],
    "normalize": true
}
```

**Response:**
```json
{
    "embeddings": [[0.1, 0.2, ...], [0.3, 0.4, ...]],
    "model": "all-MiniLM-L6-v2",
    "dimension": 384
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
    "status": "healthy"
}
```

## Configuration

The service can be configured using environment variables in `.env.local`:

- `MODEL_NAME`: The sentence transformer model to use (default: all-MiniLM-L6-v2)
- `EMBEDDING_DIMENSION`: Expected embedding dimension (default: 384)
- `MAX_BATCH_SIZE`: Maximum number of texts to process in one request (default: 32)
- `API_PORT`: Port to run the service on (default: 8000)

## Deployment

### Railway
1. Connect your repository to Railway
2. Set environment variables in the Railway dashboard
3. Deploy

### Render
1. Connect your repository to Render
2. Use the provided `render.yaml` configuration
3. Deploy

### Fly.io
1. Install the Fly CLI
2. Run `fly launch` in the project directory
3. Configure environment variables with `fly secrets set`
4. Deploy with `fly deploy`

### Docker
Build and run with Docker:
```bash
docker build -t embeddings-service .
docker run -p 8000:8000 embeddings-service
```

## Development

### Install development dependencies:
```bash
pip install -r requirements-dev.txt
```

### Run tests:
```bash
pytest
```

### Format code:
```bash
black .
isort .
```

### Lint code:
```bash
flake8 .
```

## Usage Examples

### Python
```python
import requests

response = requests.post(
    "http://localhost:8000/embeddings",
    json={
        "texts": ["Hello world", "How are you?"],
        "normalize": True
    }
)
embeddings = response.json()["embeddings"]
```

### JavaScript
```javascript
const response = await fetch('http://localhost:8000/embeddings', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        texts: ['Hello world', 'How are you?'],
        normalize: true
    })
});
const data = await response.json();
const embeddings = data.embeddings;
```

### cURL
```bash
curl -X POST "http://localhost:8000/embeddings" \
     -H "Content-Type: application/json" \
     -d '{"texts": ["Hello world", "How are you?"], "normalize": true}'
```

## Performance Notes

- The first request may take longer as the model needs to be loaded
- GPU acceleration is automatically used if available
- Batch processing is more efficient than individual requests
- The model is loaded once and reused for all requests (singleton pattern)

## License

MIT 
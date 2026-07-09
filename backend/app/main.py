from fastapi import FastAPI

app = FastAPI(
    title="Web Accessibility Platform API",
    version="1.0.0"
)

@app.get("/")
def root():
    return {"message": "Web Accessibility Platform API is running"}

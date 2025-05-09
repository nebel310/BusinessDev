import time
#Ждем полного запуска кафки
time.sleep(30)

import os
import asyncio
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import create_tables, delete_tables
from router.auth import router as auth_router
from router.video import router as video_router
from utils.kafka_consumer import consume_video_tasks
from utils.s3_storage import S3Storage
from config import settings

import shutil
from pathlib import Path
from fastapi import FastAPI
from utils.s3_storage import S3Storage
from config import settings





@asynccontextmanager
async def lifespan(app: FastAPI):
    await delete_tables()
    print('База очищена')
    await create_tables()
    print('База готова к работе')
    
    asyncio.create_task(consume_video_tasks())
    print('Кафка запущена')
    
    try:
        s3 = S3Storage()
        s3.client.create_bucket(Bucket=settings.S3_BUCKET)
        print("MinIO инициализирована")
    except Exception as e:
        print(f"MinIO ошибка в инициализации: {e}")
    
    try:    
        uploads_dir = Path(__file__).parent / "uploads"
        if uploads_dir.exists():
            shutil.rmtree(uploads_dir)
        uploads_dir.mkdir(exist_ok=True)
        print("Локальное хранилище очищено")
    except:
        print('Локальное хранилище не очищено')
    
    if os.getenv("CLEAN_S3_ON_START", "true").lower() == "true":
        try:
            s3 = S3Storage()
            objects = s3.client.list_objects_v2(Bucket=settings.S3_BUCKET)
            if 'Contents' in objects:
                for obj in objects['Contents']:
                    s3.client.delete_object(Bucket=settings.S3_BUCKET, Key=obj['Key'])
            print("S3 хранилище очищено")
        except Exception as e:
            print(f"Ошибка очистки S3: {e}")

    try:
        s3.client.create_bucket(Bucket=settings.S3_BUCKET)
    except:
        pass
    yield
    print('Выключение')


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="BussinessDev",
        version="1.0.0",
        description="API for users",
        routes=app.routes,
    )
    openapi_schema["components"]["securitySchemes"] = {
        "Bearer": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
    }
    
    secured_paths = {
        "/auth/me": {"method": "get", "security": [{"Bearer": []}]},
        "/auth/logout": {"method": "post", "security": [{"Bearer": []}]},
        "/videos/upload": {"method": "post", "security": [{"Bearer": []}]},
        "/videos/{video_id}/process": {"method": "post", "security": [{"Bearer": []}]},
    }
    
    for path, config in secured_paths.items():
        if path in openapi_schema["paths"]:
            openapi_schema["paths"][path][config["method"]]["security"] = config["security"]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app = FastAPI(lifespan=lifespan)
app.openapi = custom_openapi
app.include_router(auth_router)
app.include_router(video_router)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500", # Тут адрес фронтенда
                   "http://minio:9000",
                   "http://minio:9001" #Тут адрес minio
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Accept-Ranges"]
)
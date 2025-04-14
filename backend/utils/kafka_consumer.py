from aiokafka import AIOKafkaConsumer
import asyncio
from repositories.video import VideoRepository
import json




async def consume_video_tasks():
    consumer = AIOKafkaConsumer(
        'video_processing',
        bootstrap_servers='kafka:9092',
        group_id="video_processing_group"
    )
    await consumer.start()
    try:
        async for msg in consumer:
            data = json.loads(msg.value.decode('utf-8'))
            video_id = data['video_id']
            print(f"Обработка видео {video_id}...")
            await VideoRepository.process_video(video_id)
    finally:
        await consumer.stop()
from confluent_kafka import Producer
import json




conf = {
    'bootstrap.servers': 'kafka:9092',
}

producer = Producer(conf)

def send_video_processing_task(video_id: int):
    try:
        producer.produce(
            topic='video_processing',
            value=json.dumps({'video_id': video_id}).encode('utf-8')
        )
        producer.flush()
        print(f"Задача на обработку видео {video_id} отправлена в Kafka")
    except Exception as e:
        print(f"Ошибка отправки в Kafka: {e}")
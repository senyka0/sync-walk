import asyncio
from sqlalchemy import select
from app.core.database import async_session
from app.models.tour import City, Tour
from app.models.tour_point import TourPoint

SEED_TOURS = [
    {
        "title": "Secrets of Podil",
        "title_uk": "Таємниці Подолу",
        "description": "Discover the hidden gems of Kyiv's oldest district.",
        "description_uk": "Відкрийте приховані перлини найстарішого району Києва.",
        "city": City.KYIV,
        "cover_image_url": "/covers/podil.jpg",
        "duration_min": 90,
        "individual_price": 299,
        "group_price": 499,
        "max_participants": 5,
        "points": [
            {
                "order_index": 1,
                "title": "Kontraktova Square",
                "title_uk": "Контрактова площа",
                "description": "The historic heart of Podil.",
                "description_uk": "Історичне серце Подолу.",
                "latitude": 50.4633,
                "longitude": 30.5239,
                "audio_url": "/audio/kyiv/podil-1.mp3",
            },
            {
                "order_index": 2,
                "title": "Kyiv-Mohyla Academy",
                "title_uk": "Києво-Могилянська академія",
                "description": "One of the oldest universities in Eastern Europe.",
                "description_uk": "Один із найстаріших університетів Східної Європи.",
                "latitude": 50.4641,
                "longitude": 30.5221,
                "audio_url": "/audio/kyiv/podil-2.mp3",
            },
            {
                "order_index": 3,
                "title": "Florivsky Monastery",
                "title_uk": "Флорівський монастир",
                "description": "A serene women's monastery with origins in the 16th century.",
                "description_uk": "Спокійний жіночий монастир, що бере початок у XVI столітті.",
                "latitude": 50.4628,
                "longitude": 30.5195,
                "audio_url": "/audio/kyiv/podil-3.mp3",
            },
            {
                "order_index": 4,
                "title": "Hryhoriy Skovoroda Street",
                "title_uk": "Вулиця Григорія Сковороди",
                "description": "Named after the great Ukrainian philosopher.",
                "description_uk": "Названа на честь видатного українського філософа.",
                "latitude": 50.4617,
                "longitude": 30.5243,
                "audio_url": "/audio/kyiv/podil-4.mp3",
            },
        ],
    },
    {
        "title": "Derzhprom & Freedom Square",
        "title_uk": "Держпром і площа Свободи",
        "description": "Explore the largest public square in Ukraine.",
        "description_uk": "Дослідіть найбільшу громадську площу України.",
        "city": City.KHARKIV,
        "cover_image_url": "/covers/freedom.jpg",
        "duration_min": 70,
        "individual_price": 279,
        "group_price": 399,
        "max_participants": 5,
        "points": [
            {
                "order_index": 1,
                "title": "Freedom Square",
                "title_uk": "Площа Свободи",
                "description": "One of the largest city squares in Europe.",
                "description_uk": "Одна з найбільших міських площ Європи.",
                "latitude": 49.9935,
                "longitude": 36.2304,
                "audio_url": "/audio/kharkiv/derzhprom-1.mp3",
            },
            {
                "order_index": 2,
                "title": "Derzhprom Building",
                "title_uk": "Будівля Держпрому",
                "description": "A Constructivist masterpiece built 1925-1928.",
                "description_uk": "Шедевр конструктивізму, збудований у 1925-1928 роках.",
                "latitude": 49.9941,
                "longitude": 36.2287,
                "audio_url": "/audio/kharkiv/derzhprom-2.mp3",
            },
            {
                "order_index": 3,
                "title": "Kharkiv National University",
                "title_uk": "Харківський національний університет",
                "description": "One of the oldest universities in Ukraine.",
                "description_uk": "Один із найстаріших університетів України.",
                "latitude": 49.9929,
                "longitude": 36.2318,
                "audio_url": "/audio/kharkiv/derzhprom-3.mp3",
            },
        ],
    },
]


async def create_tables():
    from app.core.database import engine
    from app.models.base import Base
    import app.models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created")


async def seed():
    await create_tables()

    async with async_session() as session:
        existing = await session.execute(select(Tour).limit(1))
        if existing.scalar_one_or_none():
            print("Data already seeded, skipping")
            return

        seed_data = [dict(t) for t in SEED_TOURS]
        for tour_data in seed_data:
            points_data = tour_data.pop("points")
            tour = Tour(**tour_data)
            session.add(tour)
            await session.flush()

            for point_data in points_data:
                point = TourPoint(tour_id=tour.id, **point_data)
                session.add(point)

        await session.commit()
        print(f"Seeded {len(SEED_TOURS)} tours")


if __name__ == "__main__":
    asyncio.run(seed())

import asyncio
from sqlalchemy import select
from app.core.database import async_session
from app.models.tour import City, Tour
from app.models.tour_point import TourPoint

SEED_TOURS = [
    {
        "title": "Heart of Podil",  # Серце Подолу
        "title_uk": "Серце Подолу",
        "description": "The “Heart of Podil” tour is a short walk through Kyiv’s oldest district, starting at Poshtova Square by the Dnipro River, passing the historic Kyiv Funicular and lively Sahaidachnoho Street, continuing to Kontraktova Square with Gostinyi Dvir, and ending at Kyiv-Mohyla Academy—a symbol of the city’s cultural and educational heritage.",  # Відкрийте приховані перлини найстарішого району Києва.
        "description_uk": "Тур «Серце Подолу» — це коротка прогулянка найстарішим районом Києва: від Поштова площа уздовж Дніпра через Київський фунікулер і жваву Вулиця Сагайдачного до Контрактова площа з Гостиний двір, завершуючись біля Києво-Могилянська академія — символу освіти й культури старого міста.",
        "city": City.KYIV,
        "cover_image_url": "/covers/podil.jpg",
        "duration_min": 5,
        "individual_price": 1,
        "group_price": 2,
        "max_participants": 5,
        "points": [
            {
                "order_index": 1,
                "title": "Poshtova Square (River Station)",  # Поштова площа (Річĸовий воĸзал)
                "title_uk": "Поштова площа (Річĸовий воĸзал)",
                "description": "A place where you begin your acquaintance with the Dnipro and the history of Kyiv trade.",  # Місце, де починається знайомство з Дніпром та історією торгівлі Києва.
                "description_uk": "Місце, де починається знайомство з Дніпром та історією торгівлі Києва.",
                "latitude": 50.459101759522916,
                "longitude": 30.52700315279664,
                "audio_url_en": "/audio/kyiv/podil-1.mp3",
                "audio_url_uk": "/audio/kyiv/podil-1.mp3",
            },
            {
                "order_index": 2,
                "title": "Funicular (Lower Station)",  # Фуніĸулер (Нижня станція)
                "title_uk": "Фуніĸулер (Нижня станція)",
                "description": "A unique mode of transport connecting the Upper Town and Podil for over 100 years.",  # Уніĸальний транспорт, що з’єднує Верхнє місто та Поділ уже понад 100 роĸів.
                "description_uk": "Уніĸальний транспорт, що з’єднує Верхнє місто та Поділ уже понад 100 роĸів.",
                "latitude": 50.4583,
                "longitude": 30.5256,
                "audio_url_en": "/audio/kyiv/podil-2.mp3",
                "audio_url_uk": "/audio/kyiv/podil-2.mp3",
            },
            {
                "order_index": 3,
                "title": "Sahaidachnoho Street (Pedestrian Area)",  # Вулиця Сагайдачного (Пішохідна зона)
                "title_uk": "Вулиця Сагайдачного (Пішохідна зона)",
                "description": "The main artery of Podil with merchants' houses and cozy cafes.",  # Головна артерія Подолу з ĸупецьĸими будинĸами та затишними ĸафе.
                "description_uk": "Головна артерія Подолу з ĸупецьĸими будинĸами та затишними ĸафе.",
                "latitude": 50.4611,
                "longitude": 30.5218,
                "audio_url_en": "/audio/kyiv/podil-3.mp3",
                "audio_url_uk": "/audio/kyiv/podil-3.mp3",
            },
            {
                "order_index": 4,
                "title": "Hostynnyi Dvir and Kontraktova Square",  # Гостиний двір та Контраĸтова площа
                "title_uk": "Гостиний двір та Контраĸтова площа",
                "description": "The center of business life in Old Kyiv, where the most important agreements were made.",  # Центр ділового життя старого Києва, де уĸладали найважливіші угоди.
                "description_uk": "Центр ділового життя старого Києва, де уĸладали найважливіші угоди.",
                "latitude": 50.4641,
                "longitude": 30.5176,
                "audio_url_en": "/audio/kyiv/podil-4.mp3",
                "audio_url_uk": "/audio/kyiv/podil-4.mp3",
            },
            {
                "order_index": 5,
                "title": "Kyiv-Mohyla Academy",  # Київо-Могилянсьĸа аĸадемія
                "title_uk": "Київо-Могилянсьĸа аĸадемія",
                "description": "One of the oldest educational centers in Eastern Europe.",  # Один із найстаріших освітніх центрів Східної Європи.
                "description_uk": "Один із найстаріших освітніх центрів Східної Європи.",
                "latitude": 50.4651,
                "longitude": 30.5197,
                "audio_url_en": "/audio/kyiv/podil-5.mp3",
                "audio_url_uk": "/audio/kyiv/podil-5.mp3",
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
                "audio_url_en": "/audio/kharkiv/derzhprom-1.mp3",
                "audio_url_uk": "/audio/kharkiv/derzhprom-1.mp3",
            },
            {
                "order_index": 2,
                "title": "Derzhprom Building",
                "title_uk": "Будівля Держпрому",
                "description": "A Constructivist masterpiece built 1925-1928.",
                "description_uk": "Шедевр конструктивізму, збудований у 1925-1928 роках.",
                "latitude": 49.9941,
                "longitude": 36.2287,
                "audio_url_en": "/audio/kharkiv/derzhprom-2.mp3",
                "audio_url_uk": "/audio/kharkiv/derzhprom-2.mp3",
            },
            {
                "order_index": 3,
                "title": "Kharkiv National University",
                "title_uk": "Харківський національний університет",
                "description": "One of the oldest universities in Ukraine.",
                "description_uk": "Один із найстаріших університетів України.",
                "latitude": 49.9929,
                "longitude": 36.2318,
                "audio_url_en": "/audio/kharkiv/derzhprom-3.mp3",
                "audio_url_uk": "/audio/kharkiv/derzhprom-3.mp3",
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

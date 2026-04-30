from datetime import datetime, timezone, date
import math
import re
import os
import uvicorn
from enum import Enum
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, Header
from pydantic import BaseModel, field_validator
from sqlalchemy import create_engine, String, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker, Session
from contextlib import asynccontextmanager

# 1. ENUMS & CẤU HÌNH DATABASE
class UserRoleEnum(str, Enum):
    ADMIN = "ADMIN"
    RECEPTIONIST = "RECEPTIONIST"

class RoomStatusEnum(str, Enum):
    AVAILABLE = "AVAILABLE"
    OCCUPIED = "OCCUPIED"
    CLEANING = "CLEANING"

class RentalTypeEnum(str, Enum):
    HOURLY = "HOURLY"
    OVERNIGHT = "OVERNIGHT"
    DAILY = "DAILY"

class BookingStatusEnum(str, Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"

# Đường dẫn tới thư mục database
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "database", "nhanghi_hotel.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

# ==========================================
# 2. SQLALCHEMY MODELS
# ==========================================
class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRoleEnum] = mapped_column(default=UserRoleEnum.RECEPTIONIST)

class RoomCategory(Base):
    __tablename__ = "room_categories"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    price_first_hour: Mapped[int] = mapped_column(Integer, nullable=False)
    price_next_hour: Mapped[int] = mapped_column(Integer, nullable=False)
    price_overnight: Mapped[int] = mapped_column(Integer, nullable=False)
    price_daily: Mapped[int] = mapped_column(Integer, nullable=False)
    rooms: Mapped[List["Room"]] = relationship(back_populates="category")

class Room(Base):
    __tablename__ = "rooms"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    room_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    floor: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[RoomStatusEnum] = mapped_column(default=RoomStatusEnum.AVAILABLE, nullable=False)
    category_id: Mapped[int] = mapped_column(ForeignKey("room_categories.id"), nullable=False)
    category: Mapped["RoomCategory"] = relationship(back_populates="rooms")
    bookings: Mapped[List["Booking"]] = relationship(back_populates="room", cascade="all, delete-orphan")

class Service(Base):
    __tablename__ = "services"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False)

class Booking(Base):
    __tablename__ = "bookings"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    guest_name: Mapped[Optional[str]] = mapped_column(String(100))
    guest_id_number: Mapped[Optional[str]] = mapped_column(String(20))
    guest_dob: Mapped[Optional[str]] = mapped_column(String(20))
    rental_type: Mapped[RentalTypeEnum] = mapped_column(nullable=False)
    check_in_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    check_out_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    room_charge: Mapped[int] = mapped_column(Integer, default=0)
    service_charge: Mapped[int] = mapped_column(Integer, default=0)
    total_amount: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[BookingStatusEnum] = mapped_column(default=BookingStatusEnum.ACTIVE, nullable=False)
    
    room: Mapped["Room"] = relationship(back_populates="bookings")
    services_used: Mapped[List["BookingService"]] = relationship(back_populates="booking", cascade="all, delete-orphan")

class BookingService(Base):
    __tablename__ = "booking_services"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id"), nullable=False)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    price_at_time: Mapped[int] = mapped_column(Integer, nullable=False)
    
    booking: Mapped["Booking"] = relationship(back_populates="services_used")
    service: Mapped["Service"] = relationship()

# ==========================================
# 3. INITIALIZATION & LIFESPAN
# ==========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            db.add(User(username="admin", password="admin", role=UserRoleEnum.ADMIN))
            db.add(User(username="staff", password="123", role=UserRoleEnum.RECEPTIONIST))
            
            cat_std = RoomCategory(name="STANDARD", price_first_hour=60000, price_next_hour=20000, price_overnight=150000, price_daily=250000)
            cat_vip = RoomCategory(name="VIP", price_first_hour=100000, price_next_hour=40000, price_overnight=250000, price_daily=450000)
            db.add_all([cat_std, cat_vip])
            db.flush()
            
            db.add_all([
                Room(room_number="101", floor=1, category_id=cat_std.id),
                Room(room_number="102", floor=1, category_id=cat_std.id),
                Room(room_number="201", floor=2, category_id=cat_vip.id),
                Room(room_number="202", floor=2, category_id=cat_vip.id),
            ])
            
            db.add_all([
                Service(name="Sting đỏ", price=15000),
                Service(name="Coca Cola", price=15000),
                Service(name="Mì ly", price=20000),
                Service(name="Nước suối", price=10000),
            ])
            db.commit()
            print("Database initialized with default data!")
    finally:
        db.close()
    yield

app = FastAPI(title="Hệ thống Quản lý Nhà nghỉ API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 4. PYDANTIC SCHEMAS
# ==========================================
class CheckInRequest(BaseModel):
    room_id: int
    user_id: int
    guest_name: str
    guest_id_number: str
    guest_dob: str
    rental_type: RentalTypeEnum

    @field_validator('guest_name')
    @classmethod
    def validate_name(cls, v):
        if not re.match(r"^[a-zA-Z\sÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểếệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ\s]+$", v):
            raise ValueError('Họ tên chỉ được chứa chữ cái và khoảng trắng')
        return v

    @field_validator('guest_id_number')
    @classmethod
    def validate_id(cls, v):
        if not v.isdigit(): raise ValueError('Số CCCD phải là dãy số')
        if len(v) not in [9, 12]: raise ValueError('Số CCCD phải có 9 hoặc 12 chữ số')
        return v

    @field_validator('guest_dob')
    @classmethod
    def validate_age(cls, v):
        try:
            dob = datetime.strptime(v, "%Y-%m-%d").date()
            today = date.today()
            age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
            if age < 18: raise ValueError('Khách hàng phải từ 18 tuổi trở lên')
        except ValueError as e:
            if "18 tuổi" in str(e): raise e
            raise ValueError('Định dạng ngày sinh không hợp lệ (YYYY-MM-DD)')
        return v

class AddServiceRequest(BaseModel):
    service_id: int
    quantity: int
    @field_validator('quantity')
    @classmethod
    def validate_qty(cls, v):
        if v <= 0: raise ValueError('Số lượng phải lớn hơn 0')
        return v

class BatchServiceItem(BaseModel):
    service_id: int
    quantity: int

class BatchServicesRequest(BaseModel):
    services: List[BatchServiceItem]

class LoginRequest(BaseModel):
    username: str
    password: str

class RoomCreateRequest(BaseModel):
    room_number: str
    floor: int
    category_id: int

class UserCreateRequest(BaseModel):
    username: str
    password: str
    role: UserRoleEnum

class RoomCategoryUpdateRequest(BaseModel):
    price_first_hour: int
    price_next_hour: int
    price_overnight: int
    price_daily: int
    @field_validator('price_first_hour', 'price_next_hour', 'price_overnight', 'price_daily')
    @classmethod
    def validate_prices(cls, v):
        if v < 0: raise ValueError('Giá tiền không được nhỏ hơn 0')
        return v

class ServiceCreateRequest(BaseModel):
    name: str
    price: int
    @field_validator('price')
    @classmethod
    def validate_price(cls, v):
        if v <= 0: raise ValueError('Giá dịch vụ phải lớn hơn 0')
        return v

class CheckoutResponse(BaseModel):
    booking_id: int
    room_number: str
    check_in_time: datetime
    check_out_time: datetime
    hours_stayed: float
    room_charge: int
    service_charge: int
    total_amount: int
    service_details: Optional[List[dict]] = None
    status: Optional[str] = None

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_admin_role(x_role: str = Header(None)):
    if x_role != UserRoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Bạn không có quyền thực hiện hành động này")
    return x_role

# ==========================================
# 5. ROUTES
# ==========================================
@app.post("/api/login", tags=["Hệ thống"])
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or user.password != req.password:
        raise HTTPException(status_code=401, detail="Tên đăng nhập hoặc mật khẩu không đúng")
    return {"id": user.id, "username": user.username, "role": user.role}

@app.get("/api/admin/staff", tags=["Quản lý - Admin"])
def list_staff(db: Session = Depends(get_db), role: str = Depends(check_admin_role)):
    return db.query(User).all()

@app.post("/api/admin/staff", tags=["Quản lý - Admin"])
def create_staff(req: UserCreateRequest, db: Session = Depends(get_db), role: str = Depends(check_admin_role)):
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Tên đăng nhập đã tồn tại")
    new_user = User(username=req.username, password=req.password, role=req.role)
    db.add(new_user)
    db.commit()
    return {"message": "Tạo nhân viên thành công"}

@app.get("/api/admin/revenue", tags=["Quản lý - Admin"])
def get_revenue(db: Session = Depends(get_db), role: str = Depends(check_admin_role)):
    total = db.query(func.sum(Booking.total_amount)).filter(Booking.status == BookingStatusEnum.COMPLETED).scalar() or 0
    room_total = db.query(func.sum(Booking.room_charge)).filter(Booking.status == BookingStatusEnum.COMPLETED).scalar() or 0
    service_total = db.query(func.sum(Booking.service_charge)).filter(Booking.status == BookingStatusEnum.COMPLETED).scalar() or 0
    return {"total_revenue": total, "room_revenue": room_total, "service_revenue": service_total}

@app.get("/api/admin/room-categories", tags=["Quản lý - Giá"])
def list_categories(db: Session = Depends(get_db)):
    return db.query(RoomCategory).all()

@app.put("/api/admin/room-categories/{cat_id}", tags=["Quản lý - Giá"])
def update_category_price(cat_id: int, req: RoomCategoryUpdateRequest, db: Session = Depends(get_db), role: str = Depends(check_admin_role)):
    cat = db.query(RoomCategory).filter(RoomCategory.id == cat_id).first()
    if not cat: raise HTTPException(status_code=404, detail="Không tìm thấy loại phòng")
    cat.price_first_hour = req.price_first_hour
    cat.price_next_hour = req.price_next_hour
    cat.price_overnight = req.price_overnight
    cat.price_daily = req.price_daily
    db.commit()
    return {"message": "Cập nhật giá thành công"}

@app.get("/api/services", tags=["Dịch vụ"])
def list_services(db: Session = Depends(get_db)):
    return db.query(Service).all()

@app.post("/api/admin/services", tags=["Quản lý - Dịch vụ"])
def create_service(req: ServiceCreateRequest, db: Session = Depends(get_db), role: str = Depends(check_admin_role)):
    new_service = Service(name=req.name, price=req.price)
    db.add(new_service)
    db.commit()
    return {"message": "Thêm dịch vụ thành công"}

@app.put("/api/admin/services/{service_id}", tags=["Quản lý - Dịch vụ"])
def update_service(service_id: int, req: ServiceCreateRequest, db: Session = Depends(get_db), role: str = Depends(check_admin_role)):
    svc = db.query(Service).filter(Service.id == service_id).first()
    if not svc: raise HTTPException(status_code=404, detail="Không thấy dịch vụ")
    svc.name = req.name
    svc.price = req.price
    db.commit()
    return {"message": "Cập nhật thành công"}

@app.delete("/api/admin/services/{service_id}", tags=["Quản lý - Dịch vụ"])
def delete_service(service_id: int, db: Session = Depends(get_db), role: str = Depends(check_admin_role)):
    svc = db.query(Service).filter(Service.id == service_id).first()
    if not svc: raise HTTPException(status_code=404, detail="Không thấy dịch vụ")
    db.delete(svc)
    db.commit()
    return {"message": "Xóa thành công"}

@app.get("/api/admin/invoices", tags=["Quản lý - Admin"])
def list_invoices(db: Session = Depends(get_db), role: str = Depends(check_admin_role)):
    return db.query(Booking).filter(Booking.status == BookingStatusEnum.COMPLETED).order_by(Booking.check_out_time.desc()).all()

@app.post("/api/admin/rooms", tags=["Quản lý - Admin"])
def create_room(req: RoomCreateRequest, db: Session = Depends(get_db), role: str = Depends(check_admin_role)):
    existing = db.query(Room).filter(Room.room_number == req.room_number).first()
    if existing: raise HTTPException(status_code=400, detail="Tên phòng đã tồn tại")
    new_room = Room(room_number=req.room_number, floor=req.floor, category_id=req.category_id)
    db.add(new_room)
    db.commit()
    return {"message": "Thêm phòng thành công"}

@app.delete("/api/admin/rooms/{room_id}", tags=["Quản lý - Admin"])
def delete_room(room_id: int, db: Session = Depends(get_db), role: str = Depends(check_admin_role)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room: raise HTTPException(status_code=404, detail="Không thấy phòng")
    if room.status != RoomStatusEnum.AVAILABLE:
        raise HTTPException(status_code=400, detail="Chỉ có thể xóa phòng đang trống")
    db.delete(room)
    db.commit()
    return {"message": "Xóa phòng thành công"}

@app.get("/api/rooms", tags=["Lễ tân - Nghiệp vụ"])
def get_rooms(db: Session = Depends(get_db)):
    rooms = db.query(Room).all()
    result = []
    for r in rooms:
        active_booking = None
        if r.status == RoomStatusEnum.OCCUPIED:
            active_booking = db.query(Booking).filter(Booking.room_id == r.id, Booking.status == BookingStatusEnum.ACTIVE).first()
        result.append({
            "id": r.id, "room_number": r.room_number, "status": r.status, "floor": r.floor,
            "category_name": r.category.name, "price_first_hour": r.category.price_first_hour,
            "active_booking_id": active_booking.id if active_booking else None
        })
    return result

@app.post("/api/rooms/{room_id}/clean", tags=["Lễ tân - Nghiệp vụ"])
def finish_cleaning(room_id: int, db: Session = Depends(get_db)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room: raise HTTPException(status_code=404, detail="Không tìm thấy phòng")
    room.status = RoomStatusEnum.AVAILABLE
    db.commit()
    return {"message": "Phòng đã sẵn sàng đón khách"}

@app.post("/api/bookings/check-in", tags=["Lễ tân - Nghiệp vụ"])
def check_in_room(req: CheckInRequest, db: Session = Depends(get_db)):
    room = db.query(Room).filter(Room.id == req.room_id).first()
    if not room or room.status != RoomStatusEnum.AVAILABLE:
        raise HTTPException(status_code=400, detail="Phòng không sẵn sàng")
    new_booking = Booking(
        room_id=req.room_id, user_id=req.user_id, guest_name=req.guest_name,
        guest_id_number=req.guest_id_number, guest_dob=req.guest_dob,
        rental_type=req.rental_type, status=BookingStatusEnum.ACTIVE
    )
    room.status = RoomStatusEnum.OCCUPIED
    db.add(new_booking)
    db.commit()
    return {"message": "Nhận phòng thành công", "booking_id": new_booking.id}

@app.post("/api/bookings/{booking_id}/add-service", tags=["Lễ tân - Nghiệp vụ"])
def add_service_to_booking(booking_id: int, req: AddServiceRequest, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id, Booking.status == BookingStatusEnum.ACTIVE).first()
    if not booking: raise HTTPException(status_code=404, detail="Hóa đơn không tồn tại")
    service = db.query(Service).filter(Service.id == req.service_id).first()
    if not service: raise HTTPException(status_code=404, detail="Dịch vụ không tồn tại")
    db.add(BookingService(booking_id=booking.id, service_id=service.id, quantity=req.quantity, price_at_time=service.price))
    db.commit()
    return {"message": "Thêm dịch vụ thành công"}

@app.post("/api/bookings/{booking_id}/batch-services", tags=["Lễ tân - Nghiệp vụ"])
def batch_add_services(booking_id: int, req: BatchServicesRequest, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id, Booking.status == BookingStatusEnum.ACTIVE).first()
    if not booking: raise HTTPException(status_code=404, detail="Hóa đơn không tồn tại")
    
    for item in req.services:
        service = db.query(Service).filter(Service.id == item.service_id).first()
        if not service: continue
        db.add(BookingService(
            booking_id=booking.id,
            service_id=service.id,
            quantity=item.quantity,
            price_at_time=service.price
        ))
    
    db.commit()
    return {"message": "Đã thêm các dịch vụ thành công"}

@app.get("/api/bookings/{booking_id}/preview", response_model=CheckoutResponse, tags=["Lễ tân - Nghiệp vụ"])
def preview_bill(booking_id: int, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking: raise HTTPException(status_code=404, detail="Không thấy hóa đơn")
    room = booking.room
    category = room.category
    now = datetime.now(timezone.utc)
    time_diff = now - booking.check_in_time.replace(tzinfo=now.tzinfo)
    hours_stayed = math.ceil(time_diff.total_seconds() / 3600)
    if hours_stayed == 0: hours_stayed = 1
    
    room_charge = 0
    if booking.rental_type == RentalTypeEnum.HOURLY:
        room_charge = category.price_first_hour + (max(0, hours_stayed - 1) * category.price_next_hour)
    elif booking.rental_type == RentalTypeEnum.OVERNIGHT:
        room_charge = category.price_overnight
    elif booking.rental_type == RentalTypeEnum.DAILY:
        room_charge = math.ceil(hours_stayed / 24) * category.price_daily
        
    services = db.query(BookingService).filter(BookingService.booking_id == booking.id).all()
    service_details = [{"name": s.service.name, "qty": s.quantity, "price": s.price_at_time} for s in services]
    service_charge = sum(s.quantity * s.price_at_time for s in services)
    
    return {
        "booking_id": booking.id, "room_number": room.room_number, "check_in_time": booking.check_in_time,
        "check_out_time": now, "hours_stayed": hours_stayed, "room_charge": room_charge,
        "service_charge": service_charge, "total_amount": room_charge + service_charge,
        "service_details": service_details, "status": booking.status
    }

@app.post("/api/bookings/{booking_id}/check-out", response_model=CheckoutResponse, tags=["Lễ tân - Nghiệp vụ"])
def check_out_room(booking_id: int, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking or booking.status == BookingStatusEnum.COMPLETED:
        raise HTTPException(status_code=400, detail="Hóa đơn không hợp lệ")
    
    room = booking.room
    category = room.category
    checkout_time = datetime.now(timezone.utc)
    booking.check_out_time = checkout_time
    
    time_diff = checkout_time - booking.check_in_time.replace(tzinfo=checkout_time.tzinfo)
    hours_stayed = math.ceil(time_diff.total_seconds() / 3600)
    if hours_stayed == 0: hours_stayed = 1
    
    room_charge = 0
    if booking.rental_type == RentalTypeEnum.HOURLY:
        room_charge = category.price_first_hour + (max(0, hours_stayed - 1) * category.price_next_hour)
    elif booking.rental_type == RentalTypeEnum.OVERNIGHT:
        room_charge = category.price_overnight
    elif booking.rental_type == RentalTypeEnum.DAILY:
        room_charge = math.ceil(hours_stayed / 24) * category.price_daily
        
    services = db.query(BookingService).filter(BookingService.booking_id == booking.id).all()
    service_charge = sum(s.quantity * s.price_at_time for s in services)
    service_details = [{"name": s.service.name, "qty": s.quantity, "price": s.price_at_time} for s in services]
    
    booking.room_charge = room_charge
    booking.service_charge = service_charge
    booking.total_amount = room_charge + service_charge
    booking.status = BookingStatusEnum.COMPLETED
    room.status = RoomStatusEnum.CLEANING
    
    db.commit()
    return {
        "booking_id": booking.id, "room_number": room.room_number, "check_in_time": booking.check_in_time,
        "check_out_time": checkout_time, "hours_stayed": hours_stayed, "room_charge": room_charge,
        "service_charge": service_charge, "total_amount": booking.total_amount,
        "service_details": service_details, "status": "COMPLETED"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
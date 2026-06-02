from datetime import datetime, timezone, date, timedelta
import math
import re
import os
import uvicorn
from enum import Enum
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, Header, UploadFile, File
from pydantic import BaseModel, field_validator
from sqlalchemy import create_engine, String, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker, Session
from contextlib import asynccontextmanager
import shutil
import uuid

# 1. ENUMS & CẤU HÌNH DATABASE
class UserRoleEnum(str, Enum):
    ADMIN = "ADMIN"
    RECEPTIONIST = "RECEPTIONIST"
    JANITOR = "JANITOR"
    GUEST = "GUEST"

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

class PaymentMethodEnum(str, Enum):
    CASH = "CASH"
    TRANSFER = "TRANSFER"

class ShiftStatusEnum(str, Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"

# Đường dẫn tới thư mục database
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
db_dir = os.path.join(BASE_DIR, "database")
if not os.path.exists(db_dir):
    os.makedirs(db_dir, exist_ok=True)

DB_PATH = os.path.join(db_dir, "nhanghi_hotel.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

# 2. SQLALCHEMY MODELS
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
    image1: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    image2: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    image3: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    category: Mapped["RoomCategory"] = relationship(back_populates="rooms")
    bookings: Mapped[List["Booking"]] = relationship(back_populates="room", cascade="all, delete-orphan")

class Service(Base):
    __tablename__ = "services"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False)
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0) # Thêm tồn kho

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
    payment_method: Mapped[Optional[PaymentMethodEnum]] = mapped_column(String(20))
    status: Mapped[BookingStatusEnum] = mapped_column(default=BookingStatusEnum.ACTIVE, nullable=False)
    
    room: Mapped["Room"] = relationship(back_populates="bookings")
    user: Mapped["User"] = relationship()
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

class Shift(Base):
    __tablename__ = "shifts"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    total_cash: Mapped[int] = mapped_column(Integer, default=0)
    total_transfer: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[ShiftStatusEnum] = mapped_column(default=ShiftStatusEnum.OPEN)
    
    user: Mapped["User"] = relationship()



class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    sender_role: Mapped[str] = mapped_column(String(20), nullable=False) # 'GUEST' or 'RECEPTIONIST'
    guest_username: Mapped[str] = mapped_column(String(50), nullable=False)
    guest_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    phone_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class MinibarNotification(Base):
    __tablename__ = "minibar_notifications"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    room_number: Mapped[str] = mapped_column(String(50), nullable=False)
    message: Mapped[str] = mapped_column(String(255), nullable=False)
    is_read: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


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
            db.add(User(username="admin", password="123456", role=UserRoleEnum.ADMIN))
            db.add(User(username="staff", password="123456", role=UserRoleEnum.RECEPTIONIST))
            db.add(User(username="janitor", password="123456", role=UserRoleEnum.JANITOR))
            db.add(User(username="guest", password="123456", role=UserRoleEnum.GUEST))
            
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
                Service(name="Sting đỏ", price=15000, stock_quantity=100),
                Service(name="Coca Cola", price=15000, stock_quantity=100),
                Service(name="Mì ly", price=20000, stock_quantity=100),
                Service(name="Nước suối", price=10000, stock_quantity=100),
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
    check_in_time: Optional[datetime] = None

    @field_validator('guest_name')
    @classmethod
    def validate_name(cls, v):
        if not re.match(r"^[a-zA-Z\sÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểếệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ\s]+$", v):
            raise ValueError('Họ tên chỉ được chứa chữ cái và khoảng trắng')
        if ' ' not in v.strip():
            raise ValueError('Họ tên phải có ít nhất một dấu cách (bao gồm Họ và Tên)')
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

    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        if len(v) < 3:
            raise ValueError('Tên đăng nhập phải có ít nhất 3 ký tự')
        if not re.match(r"^[a-zA-Z0-9_]+$", v):
            raise ValueError('Tên đăng nhập chỉ được chứa chữ cái, chữ số và dấu gạch dưới')
        return v

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Mật khẩu phải có ít nhất 6 ký tự')
        return v

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
    stock_quantity: Optional[int] = 0
    @field_validator('price')
    @classmethod
    def validate_price(cls, v):
        if v <= 0: raise ValueError('Giá dịch vụ phải lớn hơn 0')
        return v

class RestockRequest(BaseModel):
    quantity: int
    @field_validator('quantity')
    @classmethod
    def validate_qty(cls, v):
        if v <= 0: raise ValueError('Số lượng nhập phải lớn hơn 0')
        return v

class CheckoutRequest(BaseModel):
    payment_method: PaymentMethodEnum

class CheckoutResponse(BaseModel):
    booking_id: int
    room_number: str
    check_in_time: datetime
    check_out_time: datetime
    hours_stayed: float
    room_charge: int
    service_charge: int
    total_amount: int
    payment_method: Optional[str] = None
    service_details: Optional[List[dict]] = None
    status: Optional[str] = None

class ShiftResponse(BaseModel):
    id: int
    username: str
    start_time: datetime
    end_time: Optional[datetime] = None
    total_cash: int
    total_transfer: int
    status: ShiftStatusEnum



class ChatMessageCreate(BaseModel):
    message: str
    guest_name: Optional[str] = None
    phone_number: Optional[str] = None

    @field_validator('guest_name')
    @classmethod
    def validate_name(cls, v):
        if v:
            if not re.match(r"^[a-zA-Z\sÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểếệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ\s]+$", v):
                raise ValueError('Họ tên chỉ được chứa chữ cái và khoảng trắng')
            if ' ' not in v.strip():
                raise ValueError('Họ tên phải có ít nhất một dấu cách (bao gồm Họ và Tên)')
        return v

    @field_validator('phone_number')
    @classmethod
    def validate_phone(cls, v):
        if v:
            v_clean = re.sub(r'[\s-]', '', v)
            if not re.match(r'^(\+84|84|0)(3|5|7|8|9)\d{8}$', v_clean):
                raise ValueError('Số điện thoại không hợp lệ (phải bắt đầu bằng 0, 84 hoặc +84 và gồm 10 chữ số)')
            return v_clean
        return v

    @field_validator('message')
    @classmethod
    def validate_msg(cls, v):
        if len(v.strip()) == 0:
            raise ValueError('Tin nhắn không được bỏ trống')
        return v

class ChatReplyCreate(BaseModel):
    message: str

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

def check_janitor_role(x_role: str = Header(None)):
    if x_role != UserRoleEnum.JANITOR:
        raise HTTPException(status_code=403, detail="Chỉ lao công mới được thực hiện hành động này")
    return x_role

def check_not_guest(x_role: str = Header(None)):
    if x_role == UserRoleEnum.GUEST:
        raise HTTPException(status_code=403, detail="Khách hàng không có quyền thực hiện hành động này")
    return x_role

def check_guest_role(x_role: str = Header(None)):
    if x_role != UserRoleEnum.GUEST:
        raise HTTPException(status_code=403, detail="Chỉ tài khoản Khách hàng (Guest) mới có quyền gửi tin nhắn tư vấn/hỗ trợ")
    return x_role

def check_receptionist_or_admin(x_role: str = Header(None)):
    if x_role not in [UserRoleEnum.RECEPTIONIST, UserRoleEnum.ADMIN]:
        raise HTTPException(status_code=403, detail="Chỉ Lễ tân hoặc Quản lý mới có quyền xem thông tin phản hồi")
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

@app.post("/api/register", tags=["Hệ thống"])
def register(req: UserCreateRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Tên đăng nhập đã tồn tại")
    new_user = User(username=req.username, password=req.password, role=req.role)
    db.add(new_user)
    db.commit()
    return {"message": "Đăng ký thành công"}

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
    # 1. Tổng quan
    total = db.query(func.sum(Booking.total_amount)).filter(Booking.status == BookingStatusEnum.COMPLETED).scalar() or 0
    room_total = db.query(func.sum(Booking.room_charge)).filter(Booking.status == BookingStatusEnum.COMPLETED).scalar() or 0
    service_total = db.query(func.sum(Booking.service_charge)).filter(Booking.status == BookingStatusEnum.COMPLETED).scalar() or 0
    
    # 2. Theo phương thức thanh toán
    cash_total = db.query(func.sum(Booking.total_amount)).filter(Booking.status == BookingStatusEnum.COMPLETED, Booking.payment_method == PaymentMethodEnum.CASH).scalar() or 0
    transfer_total = db.query(func.sum(Booking.total_amount)).filter(Booking.status == BookingStatusEnum.COMPLETED, Booking.payment_method == PaymentMethodEnum.TRANSFER).scalar() or 0
    
    # 3. Doanh thu 7 ngày gần nhất
    daily_stats = []
    for i in range(6, -1, -1):
        target_date = date.today() - timedelta(days=i)
        start_dt = datetime.combine(target_date, datetime.min.time())
        end_dt = datetime.combine(target_date, datetime.max.time())
        
        day_revenue = db.query(func.sum(Booking.total_amount)).filter(
            Booking.status == BookingStatusEnum.COMPLETED,
            Booking.check_out_time >= start_dt,
            Booking.check_out_time <= end_dt
        ).scalar() or 0
        
        daily_stats.append({
            "date": target_date.strftime("%d/%m"),
            "amount": day_revenue
        })
        
    return {
        "total_revenue": total,
        "room_revenue": room_total,
        "service_revenue": service_total,
        "cash_revenue": cash_total,
        "transfer_revenue": transfer_total,
        "daily_stats": daily_stats
    }

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
    new_service = Service(name=req.name, price=req.price, stock_quantity=req.stock_quantity)
    db.add(new_service)
    db.commit()
    return {"message": "Thêm dịch vụ thành công"}

@app.post("/api/admin/services/{service_id}/restock", tags=["Quản lý - Dịch vụ"])
def restock_service(service_id: int, req: RestockRequest, db: Session = Depends(get_db), role: str = Depends(check_admin_role)):
    svc = db.query(Service).filter(Service.id == service_id).first()
    if not svc: raise HTTPException(status_code=404, detail="Không thấy dịch vụ")
    svc.stock_quantity += req.quantity
    db.commit()
    return {"message": f"Đã nhập thêm {req.quantity} sản phẩm vào kho", "new_stock": svc.stock_quantity}

@app.put("/api/admin/services/{service_id}", tags=["Quản lý - Dịch vụ"])
def update_service(service_id: int, req: ServiceCreateRequest, db: Session = Depends(get_db), role: str = Depends(check_admin_role)):
    svc = db.query(Service).filter(Service.id == service_id).first()
    if not svc: raise HTTPException(status_code=404, detail="Không thấy dịch vụ")
    svc.name = req.name
    svc.price = req.price
    svc.stock_quantity = req.stock_quantity
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
    invoices = db.query(Booking).filter(Booking.status == BookingStatusEnum.COMPLETED).order_by(Booking.check_out_time.desc()).all()
    return [{
        "id": inv.id,
        "room_number": inv.room.room_number,
        "guest_name": inv.guest_name,
        "total_amount": inv.total_amount,
        "check_out_time": inv.check_out_time,
        "payment_method": inv.payment_method,
        "username": inv.user.username if inv.user else "N/A"  # Kiểm tra nếu inv.user tồn tại
    } for inv in invoices]

@app.get("/api/admin/shifts", tags=["Quản lý - Admin"])
def list_shifts(db: Session = Depends(get_db), role: str = Depends(check_admin_role)):
    shifts = db.query(Shift).order_by(Shift.start_time.desc()).all()
    return [{
        "id": s.id,
        "username": s.user.username,
        "start_time": s.start_time,
        "end_time": s.end_time,
        "total_cash": s.total_cash,
        "total_transfer": s.total_transfer,
        "status": s.status
    } for s in shifts]

@app.post("/api/admin/rooms", tags=["Quản lý - Admin"])
def create_room(req: RoomCreateRequest, db: Session = Depends(get_db), role: str = Depends(check_admin_role)):
    existing = db.query(Room).filter(Room.room_number == req.room_number).first()
    if existing: raise HTTPException(status_code=400, detail="Tên phòng đã tồn tại")
    new_room = Room(room_number=req.room_number, floor=req.floor, category_id=req.category_id)
    db.add(new_room)
    db.commit()
    return {"message": "Thêm phòng thành công"}

@app.post("/api/admin/rooms/{room_id}/upload-images", tags=["Quản lý - Admin"])
def upload_room_images(
    room_id: int,
    image1: Optional[UploadFile] = File(None),
    image2: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    role: str = Depends(check_admin_role)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room: raise HTTPException(status_code=404, detail="Không tìm thấy phòng")
    
    upload_dir = os.path.join(FRONTEND_DIR, "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    files = [image1, image2]
    for idx, f in enumerate(files, start=1):
        if f and f.filename:
            ext = os.path.splitext(f.filename)[1]
            unique_filename = f"room_{room_id}_img{idx}_{uuid.uuid4().hex[:8]}{ext}"
            file_path = os.path.join(upload_dir, unique_filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(f.file, buffer)
            
            setattr(room, f"image{idx}", f"uploads/{unique_filename}")
            
    db.commit()
    return {"message": "Tải hình ảnh lên thành công"}

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
            "active_booking_id": active_booking.id if active_booking else None,
            "image1": r.image1, "image2": r.image2, "image3": r.image3
        })
    return result

@app.post("/api/rooms/{room_id}/clean", tags=["Lễ tân - Nghiệp vụ"])
def finish_cleaning(room_id: int, db: Session = Depends(get_db), role: str = Depends(check_janitor_role)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room: raise HTTPException(status_code=404, detail="Không tìm thấy phòng")
    room.status = RoomStatusEnum.AVAILABLE
    db.commit()
    return {"message": "Phòng đã sẵn sàng đón khách"}

@app.get("/api/janitor/notifications", tags=["Thông báo - Janitor"])
def list_janitor_notifications(db: Session = Depends(get_db), role: str = Depends(check_janitor_role)):
    notifs = db.query(MinibarNotification).filter(MinibarNotification.is_read == False).order_by(MinibarNotification.created_at.desc()).all()
    return [{
        "id": n.id,
        "room_number": n.room_number,
        "message": n.message,
        "is_read": n.is_read,
        "created_at": n.created_at
    } for n in notifs]

@app.post("/api/janitor/notifications/{notif_id}/read", tags=["Thông báo - Janitor"])
def read_janitor_notification(notif_id: int, db: Session = Depends(get_db), role: str = Depends(check_janitor_role)):
    notif = db.query(MinibarNotification).filter(MinibarNotification.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông báo")
    notif.is_read = True
    db.commit()
    return {"message": "Đã đọc thông báo"}

@app.post("/api/janitor/notifications/read-all", tags=["Thông báo - Janitor"])
def read_all_janitor_notifications(db: Session = Depends(get_db), role: str = Depends(check_janitor_role)):
    db.query(MinibarNotification).filter(MinibarNotification.is_read == False).update({MinibarNotification.is_read: True}, synchronize_session=False)
    db.commit()
    return {"message": "Đã đọc tất cả thông báo"}

@app.post("/api/bookings/check-in", tags=["Lễ tân - Nghiệp vụ"])
def check_in_room(req: CheckInRequest, db: Session = Depends(get_db), role: str = Depends(check_not_guest)):
    room = db.query(Room).filter(Room.id == req.room_id).first()
    if not room or room.status != RoomStatusEnum.AVAILABLE:
        raise HTTPException(status_code=400, detail="Phòng không sẵn sàng")
    
    booking_time = datetime.now()
    if req.check_in_time:
        in_time = req.check_in_time
        if in_time.tzinfo is not None:
            in_time = in_time.astimezone()
            in_time = in_time.replace(tzinfo=None)
        if in_time < (datetime.now() - timedelta(minutes=1)):
            raise HTTPException(status_code=400, detail="Thời gian nhận phòng không được trước thời gian hiện tại")
        booking_time = in_time

    new_booking = Booking(
        room_id=req.room_id, user_id=req.user_id, guest_name=req.guest_name,
        guest_id_number=req.guest_id_number, guest_dob=req.guest_dob,
        rental_type=req.rental_type, check_in_time=booking_time, status=BookingStatusEnum.ACTIVE
    )
    room.status = RoomStatusEnum.OCCUPIED
    db.add(new_booking)
    db.commit()
    return {"message": "Nhận phòng thành công", "booking_id": new_booking.id}

@app.post("/api/bookings/{booking_id}/add-service", tags=["Lễ tân - Nghiệp vụ"])
def add_service_to_booking(booking_id: int, req: AddServiceRequest, db: Session = Depends(get_db), role: str = Depends(check_not_guest)):
    booking = db.query(Booking).filter(Booking.id == booking_id, Booking.status == BookingStatusEnum.ACTIVE).first()
    if not booking: raise HTTPException(status_code=404, detail="Hóa đơn không tồn tại")
    service = db.query(Service).filter(Service.id == req.service_id).first()
    if not service: raise HTTPException(status_code=404, detail="Dịch vụ không tồn tại")
    
    # Kiểm tra tồn kho
    if service.stock_quantity < req.quantity:
        raise HTTPException(status_code=400, detail=f"Sản phẩm {service.name} chỉ còn {service.stock_quantity} trong kho")
    
    # Trừ kho
    service.stock_quantity -= req.quantity
    
    db.add(BookingService(booking_id=booking.id, service_id=service.id, quantity=req.quantity, price_at_time=service.price))
    
    # Gửi thông báo minibar cho Janitor
    room_number = booking.room.room_number
    notif_msg = f"Phòng {room_number} vừa đặt minibar: {req.quantity}x {service.name}"
    db.add(MinibarNotification(room_number=room_number, message=notif_msg))
    
    db.commit()
    return {"message": "Thêm dịch vụ và trừ kho thành công"}

@app.post("/api/bookings/{booking_id}/batch-services", tags=["Lễ tân - Nghiệp vụ"])
def batch_add_services(booking_id: int, req: BatchServicesRequest, db: Session = Depends(get_db), role: str = Depends(check_not_guest)):
    booking = db.query(Booking).filter(Booking.id == booking_id, Booking.status == BookingStatusEnum.ACTIVE).first()
    if not booking: raise HTTPException(status_code=404, detail="Hóa đơn không tồn tại")
    
    added_items = []
    for item in req.services:
        service = db.query(Service).filter(Service.id == item.service_id).first()
        if not service: continue
        
        # Kiểm tra tồn kho cho từng món
        if service.stock_quantity < item.quantity:
            raise HTTPException(status_code=400, detail=f"Sản phẩm {service.name} không đủ tồn kho (còn {service.stock_quantity})")
        
        # Trừ kho
        service.stock_quantity -= item.quantity
        
        db.add(BookingService(
            booking_id=booking.id,
            service_id=service.id,
            quantity=item.quantity,
            price_at_time=service.price
        ))
        added_items.append(f"{item.quantity}x {service.name}")
    
    if added_items:
        room_number = booking.room.room_number
        notif_msg = f"Phòng {room_number} vừa đặt minibar: {', '.join(added_items)}"
        db.add(MinibarNotification(room_number=room_number, message=notif_msg))
        
    db.commit()
    return {"message": "Đã thêm các dịch vụ và cập nhật kho thành công"}

@app.get("/api/bookings/{booking_id}/preview", response_model=CheckoutResponse, tags=["Lễ tân - Nghiệp vụ"])
def preview_bill(booking_id: int, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking: raise HTTPException(status_code=404, detail="Không thấy hóa đơn")
    room = booking.room
    category = room.category
    now = datetime.now()
    time_diff = now - booking.check_in_time.replace(tzinfo=None)
    hours_stayed = math.ceil(time_diff.total_seconds() / 3600)
    if hours_stayed <= 0: hours_stayed = 1
    
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
def check_out_room(booking_id: int, req: CheckoutRequest, db: Session = Depends(get_db), role: str = Depends(check_not_guest)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking or booking.status == BookingStatusEnum.COMPLETED:
        raise HTTPException(status_code=400, detail="Hóa đơn không hợp lệ")
    
    room = booking.room
    category = room.category
    checkout_time = datetime.now()
    booking.check_out_time = checkout_time
    
    time_diff = checkout_time - booking.check_in_time.replace(tzinfo=None)
    hours_stayed = math.ceil(time_diff.total_seconds() / 3600)
    if hours_stayed <= 0: hours_stayed = 1
    
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
    booking.payment_method = req.payment_method
    room.status = RoomStatusEnum.CLEANING
    
    db.commit()
    return {
        "booking_id": booking.id, "room_number": room.room_number, "check_in_time": booking.check_in_time,
        "check_out_time": checkout_time, "hours_stayed": hours_stayed, "room_charge": room_charge,
        "service_charge": service_charge, "total_amount": booking.total_amount,
        "payment_method": booking.payment_method,
        "service_details": service_details, "status": "COMPLETED"
    }

# --- SHIFT ENDPOINTS ---
@app.get("/api/shifts/current/{user_id}", response_model=Optional[ShiftResponse], tags=["Ca trực"])
def get_current_shift(user_id: int, db: Session = Depends(get_db)):
    shift = db.query(Shift).filter(Shift.user_id == user_id, Shift.status == ShiftStatusEnum.OPEN).first()
    if not shift: return None
    
    # Tính toán doanh thu tạm tính trong ca
    bookings = db.query(Booking).filter(
        Booking.user_id == user_id,
        Booking.status == BookingStatusEnum.COMPLETED,
        Booking.check_out_time >= shift.start_time
    ).all()
    
    total_cash = sum(b.total_amount for b in bookings if b.payment_method == PaymentMethodEnum.CASH)
    total_transfer = sum(b.total_amount for b in bookings if b.payment_method == PaymentMethodEnum.TRANSFER)
    
    return {
        "id": shift.id, "username": shift.user.username, "start_time": shift.start_time,
        "total_cash": total_cash, "total_transfer": total_transfer, "status": shift.status
    }

@app.post("/api/shifts/start/{user_id}", tags=["Ca trực"])
def start_shift(user_id: int, db: Session = Depends(get_db), role: str = Depends(check_not_guest)):
    active = db.query(Shift).filter(Shift.user_id == user_id, Shift.status == ShiftStatusEnum.OPEN).first()
    if active: raise HTTPException(status_code=400, detail="Bạn đang có một ca trực chưa kết thúc")
    
    new_shift = Shift(user_id=user_id)
    db.add(new_shift)
    db.commit()
    return {"message": "Bắt đầu ca trực thành công"}

@app.post("/api/shifts/end/{user_id}", tags=["Ca trực"])
def end_shift(user_id: int, db: Session = Depends(get_db), role: str = Depends(check_not_guest)):
    shift = db.query(Shift).filter(Shift.user_id == user_id, Shift.status == ShiftStatusEnum.OPEN).first()
    if not shift: raise HTTPException(status_code=400, detail="Không tìm thấy ca trực đang mở")
    
    # Chốt tiền
    bookings = db.query(Booking).filter(
        Booking.user_id == user_id,
        Booking.status == BookingStatusEnum.COMPLETED,
        Booking.check_out_time >= shift.start_time
    ).all()
    
    shift.total_cash = sum(b.total_amount for b in bookings if b.payment_method == PaymentMethodEnum.CASH)
    shift.total_transfer = sum(b.total_amount for b in bookings if b.payment_method == PaymentMethodEnum.TRANSFER)
    shift.end_time = datetime.now(timezone.utc)
    shift.status = ShiftStatusEnum.CLOSED
    
    db.commit()
    return {
        "message": "Kết thúc ca trực thành công",
        "total_cash": shift.total_cash,
        "total_transfer": shift.total_transfer,
        "report": f"Tổng tiền mặt: {shift.total_cash}đ, Chuyển khoản: {shift.total_transfer}đ"
    }



@app.post("/api/chat", tags=["Hỗ trợ & Chat"])
def guest_send_message(
    req: ChatMessageCreate, 
    db: Session = Depends(get_db), 
    role: str = Depends(check_guest_role),
    x_username: str = Header(None)
):
    if not x_username:
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập để gửi tin nhắn")
    new_msg = ChatMessage(
        sender_role="GUEST",
        guest_username=x_username,
        guest_name=req.guest_name or x_username,
        phone_number=req.phone_number,
        message=req.message
    )
    db.add(new_msg)
    db.commit()
    return {"message": "Tin nhắn đã được gửi tới lễ tân!"}

@app.get("/api/chat/my", tags=["Hỗ trợ & Chat"])
def guest_get_messages(
    db: Session = Depends(get_db), 
    role: str = Depends(check_guest_role),
    x_username: str = Header(None)
):
    if not x_username:
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập để xem tin nhắn")
    messages = db.query(ChatMessage).filter(ChatMessage.guest_username == x_username).order_by(ChatMessage.created_at.asc()).all()
    return [{
        "id": m.id,
        "sender_role": m.sender_role,
        "guest_username": m.guest_username,
        "guest_name": m.guest_name,
        "phone_number": m.phone_number,
        "message": m.message,
        "created_at": m.created_at
    } for m in messages]

@app.get("/api/chat/threads", tags=["Hỗ trợ & Chat"])
def list_chat_threads(
    db: Session = Depends(get_db), 
    role: str = Depends(check_receptionist_or_admin)
):
    subquery = db.query(
        ChatMessage.guest_username,
        func.max(ChatMessage.id).label("max_id")
    ).group_by(ChatMessage.guest_username).subquery()
    
    threads = db.query(ChatMessage).join(
        subquery,
        ChatMessage.id == subquery.c.max_id
    ).order_by(ChatMessage.created_at.desc()).all()
    
    return [{
        "guest_username": t.guest_username,
        "guest_name": t.guest_name,
        "phone_number": t.phone_number,
        "latest_message": t.message,
        "created_at": t.created_at
    } for t in threads]

@app.get("/api/chat/thread/{guest_username}", tags=["Hỗ trợ & Chat"])
def get_chat_thread(
    guest_username: str,
    db: Session = Depends(get_db), 
    role: str = Depends(check_receptionist_or_admin)
):
    messages = db.query(ChatMessage).filter(ChatMessage.guest_username == guest_username).order_by(ChatMessage.created_at.asc()).all()
    return [{
        "id": m.id,
        "sender_role": m.sender_role,
        "guest_username": m.guest_username,
        "guest_name": m.guest_name,
        "phone_number": m.phone_number,
        "message": m.message,
        "created_at": m.created_at
    } for m in messages]

@app.post("/api/chat/reply/{guest_username}", tags=["Hỗ trợ & Chat"])
def reply_to_guest(
    guest_username: str,
    req: ChatReplyCreate,
    db: Session = Depends(get_db), 
    role: str = Depends(check_receptionist_or_admin)
):
    last_guest_msg = db.query(ChatMessage).filter(
        ChatMessage.guest_username == guest_username,
        ChatMessage.sender_role == "GUEST"
    ).order_by(ChatMessage.id.desc()).first()
    
    name = last_guest_msg.guest_name if last_guest_msg else "Khách hàng"
    phone = last_guest_msg.phone_number if last_guest_msg else ""
    
    new_reply = ChatMessage(
        sender_role="RECEPTIONIST",
        guest_username=guest_username,
        guest_name=name,
        phone_number=phone,
        message=req.message
    )
    db.add(new_reply)
    db.commit()
    return {"message": "Đã gửi phản hồi thành công!"}

# Mount database qrcode directory
QRCODE_DIR = os.path.join(BASE_DIR, "database", "qrcode")
if not os.path.exists(QRCODE_DIR):
    os.makedirs(QRCODE_DIR, exist_ok=True)
app.mount("/database/qrcode", StaticFiles(directory=QRCODE_DIR), name="qrcode")

# Mount static files for frontend
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    # Disable reload in production (when PORT env is set) to prevent overhead and watchfiles warnings on Render
    reload_enabled = "PORT" not in os.environ
    if reload_enabled:
        uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
    else:
        # Pass the app object directly in production to prevent path/import resolution issues on Render
        uvicorn.run(app, host="0.0.0.0", port=port)
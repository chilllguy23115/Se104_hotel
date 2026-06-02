<!-- Banner -->
<p align="center">
  <a href="https://www.uit.edu.vn/" title="Trường Đại học Công nghệ Thông tin" style="border: none;">
    <img src="https://i.imgur.com/WmMnSRt.png" alt="Trường Đại học Công nghệ Thông tin | University of Information Technology">
  </a>
</p>

<h1 align="center"><b>Nhập môn công nghệ phần mềm</b></h1>
<h2 align="center"><b>Web quản lý nhà nghỉ</b></h2>

## THÀNH VIÊN NHÓM 2
| STT    | MSSV          | Họ và Tên              
| ------ |:-------------:| ----------------------
| 1      | 23520070      | Phạm Ngô Quốc Anh      
| 2      | 24521512      | Tăng Nguyễn Bảo Quỳnh  

## GIỚI THIỆU MÔN HỌC
* **Tên môn học:** Nhập môn công nghệ phần mềm
* **Mã môn học:** SE104.Q29
* **Năm học:** HK2 (2025 - 2026)
* **Giảng viên**: T.S Đỗ Văn Tiến

---

### Giới thiệu sơ lược dự án
**Hotel Pro** là một hệ thống quản lý nhà nghỉ hiện đại hỗ trợ tối ưu hóa quy trình quản lý phòng, theo dõi hóa đơn, dịch vụ tiện ích minibar, và quản lý ca trực của nhân viên một cách chặt chẽ.

#### Các tính năng nổi bật:
* **Quản lý sơ đồ phòng trực quan**: Theo dõi thời gian thực trạng thái phòng (Phòng trống, Có khách, Đang dọn dẹp).
* **Phân quyền người dùng chặt chẽ**:
  * **Admin**: Quyền quản lý tối cao. Cấu hình danh mục phòng, định giá linh hoạt (theo giờ đầu, giờ tiếp theo, qua đêm, ngày), quản lý minibar, tài khoản nhân viên, xem báo cáo doanh thu và **tải ảnh phòng trực tiếp từ trình duyệt** (hỗ trợ tối đa 2 hình ảnh cho mỗi phòng).
  * **Lễ tân**: Thực hiện nhận phòng, trả phòng tự động tính hóa đơn, thêm dịch vụ minibar và quản lý giao ca trực (đối chiếu tiền mặt/chuyển khoản).
  * **Nhân viên dọn phòng**: Theo dõi danh sách phòng cần dọn dẹp và cập nhật trạng thái phòng sạch sẽ.
  * **Khách hàng**: Có thể xem trước hình ảnh của phòng.
* **Công nghệ phát triển**:
  * **Backend**: FastAPI (Python), SQLAlchemy ORM, SQLite Database.
  * **Frontend**: HTML5, Vanilla CSS3 (TailwindCSS JIT), Vanilla Javascript hiện đại dạng ES Modules.

---

### HƯỚNG DẪN CHẠY DEMO

Bạn có thể trải nghiệm ứng dụng bằng một trong hai cách dưới đây:

---

#### CÁCH 1: TRUY CẬP TRỰC TIẾP QUA LINK DEPLOY (RENDER)
Ứng dụng đã được triển khai trực tuyến trên cloud Render. Bạn chỉ cần click vào liên kết dưới đây để truy cập ngay mà không cần cấu hình:

* **Link trải nghiệm:** [https://se104-hotel-3.onrender.com](https://se104-hotel-3.onrender.com)

---

#### CÁCH 2: KHỞI CHẠY TRÊN MÁY CỤC BỘ 

**1. Yêu cầu hệ thống:**
Hãy đảm bảo máy tính của bạn đã cài đặt **Python (phiên bản 3.8 trở lên)**.

**2. Cài đặt thư viện:**
Mở terminal tại thư mục gốc của dự án và chạy lệnh sau để cài đặt các thư viện cần thiết:
```bash
pip install -r requirements.txt
```

**3. Khởi chạy Backend Server:**
Chạy lệnh khởi động máy chủ FastAPI/Uvicorn:
```bash
python backend/main.py
```
Máy chủ sẽ được khởi động tại địa chỉ: `http://127.0.0.1:8000`

**4. Trải nghiệm Ứng dụng:**
Hệ thống Frontend đã được tích hợp và mount tự động trong máy chủ FastAPI. Bạn chỉ cần mở trình duyệt web bất kỳ và truy cập vào đường dẫn:
```text
http://127.0.0.1:8000
```

#### 5. Danh sách tài khoản thử nghiệm
Hệ thống tự động khởi tạo cơ sở dữ liệu mẫu nếu chưa tồn tại. Bạn có thể sử dụng các tài khoản sau để thử nghiệm các vai trò:

| Vai trò | Tài khoản | Mật khẩu | Các chức năng chính |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `123456` | Quản lý giá phòng, dịch vụ, nhân viên, tải ảnh phòng trực tiếp từ trình duyệt |
| **Lễ tân** | `staff` | `123456` | Nhận/trả phòng, thêm dịch vụ minibar, bàn giao ca trực |
| **Dọn phòng** | `janitor` | `123456` | Nhận phòng cần dọn dẹp, hoàn tất dọn dẹp phòng |
| **Khách hàng** | `guest` | `123456` | Xem trước ảnh phòng |

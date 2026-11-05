# Gamevui.net — Sâm & UNO

## Chạy ứng dụng

- Node.js 20 trở lên
- Cài dependencies: `npm install`
- Chạy kiểm thử: `npm test`
- Chạy server: `npm start`

## Lưu hồ sơ người chơi lâu dài (Render + PostgreSQL)

Ứng dụng hỗ trợ PostgreSQL để lưu hồ sơ, điểm và thành tích riêng của Sâm/UNO. Nếu chưa cấu hình `DATABASE_URL`, game vẫn chạy nhưng hồ sơ chỉ tồn tại trong bộ nhớ của tiến trình và sẽ mất khi server khởi động lại.

1. Trong Render Dashboard, tạo một PostgreSQL database.
2. Mở phần kết nối database và lấy **Internal Database URL** nếu web service và database cùng workspace/region trên Render.
3. Mở Web Service của game → **Environment**.
4. Thêm biến môi trường `DATABASE_URL` với giá trị Internal Database URL.
5. Lưu thay đổi và deploy lại service.

Khi server khởi động, ứng dụng tự tạo bảng `player_profiles` và index cần thiết. Không cần chạy SQL thủ công. Endpoint `/health` trả về `persistentProfiles: true` khi biến môi trường đã được cấu hình.

### Hồ sơ người chơi

Trình duyệt tạo một mã hồ sơ ngẫu nhiên và lưu trong localStorage. Máy chủ chỉ lưu mã băm của mã hồ sơ trong PostgreSQL; mã gốc không được gửi lại cho người khác. Hồ sơ hiện gắn với trình duyệt/thiết bị đó. Xóa dữ liệu trình duyệt hoặc đổi thiết bị sẽ không tự khôi phục được hồ sơ; tính năng đăng nhập/chuyển hồ sơ giữa thiết bị là một giai đoạn riêng.

### Dữ liệu được lưu

- Tên hiển thị, điểm, số ván, số trận thắng, chuỗi thắng tốt nhất.
- Thống kê Sâm và UNO tách riêng.
- Bảng xếp hạng toàn hệ thống qua `/api/leaderboard/global?mode=sam` hoặc `mode=uno`.

Không đưa mật khẩu hoặc URL database vào mã nguồn GitHub. Giữ `DATABASE_URL` trong phần Environment của Render.

## Cửa hàng giao diện Beta

- Người chơi nhận 20 xu khi hoàn thành một ván; người thắng nhận thêm 10 xu.
- Xu dùng để mở khóa mặt bàn và kiểu viền lá bài. Vật phẩm chỉ thay đổi hình thức, không tác động luật chơi.
- Xu, vật phẩm đã mua và lựa chọn đang trang bị được lưu trong localStorage của trình duyệt hiện tại. Xóa dữ liệu trình duyệt hoặc đổi thiết bị có thể làm mất dữ liệu Beta.
- Không có nạp tiền thật, giao dịch thật hoặc đổi thưởng bằng tiền.
- Cửa hàng hiện là bản thử nghiệm phía trình duyệt; chưa có đồng bộ giữa các thiết bị và chưa cần cấu hình PostgreSQL.

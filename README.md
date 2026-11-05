# Gamevui.net — Game Hub, Sâm & UNO

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

## Tùy chỉnh giao diện Beta

- Cửa hàng chỉ gồm các tùy chỉnh trang trí như màu bàn và kiểu viền lá bài.
- Tất cả tùy chỉnh đều mở sẵn và miễn phí; người chơi có thể đổi/trang bị bất cứ lúc nào.
- Không có xu, ví, giá vật phẩm, thưởng xu hoặc cơ chế mở khóa.
- Lựa chọn giao diện được lưu trong localStorage của trình duyệt hiện tại; đổi trình duyệt/thiết bị hoặc xóa dữ liệu trang web có thể làm mất lựa chọn.
- Tùy chỉnh không ảnh hưởng luật chơi Sâm hoặc UNO.


### Voice Chat (opt-in)

- The microphone is off by default; players enable it with the in-room toggle.
- Signaling is authenticated against the existing room membership and is isolated per room.
- Audio is peer-to-peer WebRTC; the application does not record or store audio.
- For broader network compatibility, configure a TURN relay on the hosting service using environment variables (never commit credentials):
  - `TURN_URLS`: comma-separated TURN/TURNS URLs.
  - `TURN_SECRET`: shared secret for time-limited TURN REST credentials.
- Without TURN configuration, the client uses a public STUN server only; some restrictive networks may fail to connect.


## Game Hub

- Trang chủ Arcade được phục vụ tại `/`.
- Chọn Sâm hoặc UNO để tạo phòng riêng hoặc tham gia bằng mã.
- Phòng lưu loại trò chơi; người chơi không thể bắt đầu nhầm Sâm trong phòng UNO hoặc ngược lại.
- Tài khoản và hồ sơ hiện có được dùng chung. Chế độ khách vẫn được hỗ trợ.
- Giao diện game hiện tại được phục vụ tại `/play`; các trò chơi chưa phát hành được đánh dấu “Sắp ra mắt”.


## Trò chơi 2 người trên một thiết bị

- Cờ caro: `/games/caro` — bàn 15×15, X/O thay phiên, phát hiện năm quân liên tiếp, hòa và đi lại.
- Cờ vua: `/games/chess` — hai người đi quân Trắng/Đen trên cùng bàn, hỗ trợ nước đi hợp lệ, chiếu hết, hòa, nhập thành, bắt tốt qua đường và phong cấp. Luật cờ được xử lý bởi `chess.js` 0.10.3 (BSD-2-Clause), được đóng gói cục bộ trong `games/chess-engine.js`.
- Hai chế độ chơi cùng máy không tạo phòng và không ghi kết quả vào bảng xếp hạng trực tuyến.

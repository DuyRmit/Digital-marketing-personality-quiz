# What's your digital marketing superpower? — cấu trúc file

```
index.html          khung trang (chỉ markup, nạp CSS và JS)
css/
  base.css          biến màu, reset, khung trang, thanh trên cùng
  quiz.css          trang mở đầu, gallery persona, câu hỏi, kết quả, nút
  board.css         ô đăng bài, board của học sinh, hiệu ứng card nổi lên
  kiosk.css         chế độ #board trên TV, nền đường hầm sao
  responsive.css    media query (laptop, điện thoại), phải nạp cuối cùng
js/
  config.js         ★ CHỈNH NỘI DUNG Ở ĐÂY: PERSONAS, QUESTIONS, BOARD, JOIN_QR, STARFIELD
  state.js          trạng thái, tính điểm, reset
  quiz.js           các màn hình quiz (welcome, câu hỏi, tie-break, kết quả, finish)
  board.js          gọi API Worker, kiểm duyệt chữ, vẽ board và card
  kiosk.js          bố cục cột trên TV, nền sao, nút Full screen
  share.js          vẽ ảnh "Save my persona" bằng canvas
  main.js           khởi động (đặt cuối cùng)
img/
  qr.png            mã QR hiện trên TV
  *.webp            6 icon persona (creator, inclusive-marketer, trust-builder, explorer, strategist, changemaker)
```

## Lưu ý
- Thứ tự `<script>` trong `index.html` quan trọng: config → state → quiz → board → kiosk → share → main. Các file dùng chung biến toàn cục, nên đừng đổi thứ tự.
- Thứ tự `<link>` CSS cũng giữ nguyên (responsive.css cuối cùng).
- Sau mỗi lần sửa CSS/JS, tăng số `?v=1` thành `?v=2` trong `index.html` để trình duyệt tải bản mới thay vì dùng cache.
- Mã QR giờ là file `img/qr.png`. Muốn đổi QR, thay file này (hoặc sửa `JOIN_QR` trong `js/config.js`).

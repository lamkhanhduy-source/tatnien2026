/* =====================================================================
   main.js - ĐIỂM KHỞI ĐỘNG
   ---------------------------------------------------------------------
   Nạp CUỐI CÙNG (xem index.html). Chỉ gọi hàm init() của từng module
   theo đúng thứ tự. Mọi logic chi tiết nằm trong các file riêng.
   ===================================================================== */
(function () {
  "use strict";

  function start() {
    TetApp.content.init();    // 1. đổ ngày giờ, địa điểm, chương trình, ảnh vào trang
    TetApp.countdown.init();  // 2. chạy đồng hồ đếm ngược
    TetApp.music.init();      // 3. gắn sự kiện cho nút nhạc (nhạc chưa phát)
    TetApp.envelope.init();   // 4. chuẩn bị phong bì (bấm mới mở, mở xong mới phát nhạc)
    TetApp.reveal.init();     // 5. hiệu ứng hiện dần khi cuộn
    TetApp.rsvp.init();       // 6. form + tường lời chúc (kết nối nơi lưu dữ liệu)
  }

  // Các script nằm cuối <body> nên DOM thường đã sẵn sàng;
  // vẫn kiểm tra để chắc chắn nếu file bị đổi chỗ nạp.
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();

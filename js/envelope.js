/* =====================================================================
   envelope.js - PHONG BÌ MỞ THƯ Ở MÀN HÌNH ĐẦU
   ---------------------------------------------------------------------
   Quy trình khi khách bấm vào phong bì:
     1. Thêm class "open" vào .intro  -> CSS chạy hoạt ảnh lật nắp, thư trượt lên.
     2. Hiện nút nhạc và bắt đầu phát nhạc (thao tác bấm cho phép phát âm thanh).
     3. Sau ~1.9 giây: thêm class "gone" -> màn phong bì mờ dần rồi ẩn.
        Đồng thời mở khóa cuộn trang và thêm class "opened" lên <body>
        để CSS chạy hoạt ảnh xuất hiện lần lượt của phần Hero.
   Trong lúc phong bì còn che, trang bị khóa cuộn (overflow: hidden)
   để khách không kéo xuống xem nội dung phía sau.
   ===================================================================== */
(function () {
  "use strict";
  var $ = TetApp.utils.$;

  function init() {
    var intro = $("intro");
    var button = $("envBtn");

    // Người dùng bật "giảm chuyển động" -> bỏ qua thời gian chờ hoạt ảnh.
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Khóa cuộn trang khi phong bì còn đóng.
    document.documentElement.style.overflow = "hidden";

    var opened = false;  // chống bấm nhiều lần

    button.addEventListener("click", function () {
      if (opened) return;
      opened = true;

      // Bước 1: chạy hoạt ảnh mở phong bì (CSS trong envelope.css)
      intro.classList.add("open");

      // Bước 2: hiện nút nhạc và phát nhạc
      TetApp.music.showButton();
      TetApp.music.startAndSync();

      // Bước 3: chờ hoạt ảnh xong rồi ẩn màn phong bì
      setTimeout(function () {
        intro.classList.add("gone");
        document.documentElement.style.overflow = "";   // mở khóa cuộn
        document.body.classList.add("opened");          // kích hoạt hoạt ảnh Hero
        window.scrollTo(0, 0);                          // luôn bắt đầu từ đầu trang
      }, reduceMotion ? 50 : 1900);
    });
  }

  TetApp.envelope = { init: init };
})();

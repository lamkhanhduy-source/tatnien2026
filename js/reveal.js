/* =====================================================================
   reveal.js - HIỆN DẦN CÁC MỤC KHI CUỘN TỚI
   ---------------------------------------------------------------------
   Các thẻ có class "reveal" ban đầu hơi mờ và thấp xuống một chút
   (xem css/base.css). Khi chúng đi vào màn hình, ta thêm class "in"
   để CSS chạy hiệu ứng hiện lên mượt.

   Dùng IntersectionObserver: API của trình duyệt báo "phần tử này đã
   vào màn hình chưa", hiệu quả hơn nhiều so với lắng nghe sự kiện cuộn.

   Các lớp bảo vệ để nội dung KHÔNG BAO GIỜ bị kẹt ở trạng thái ẩn:
     - Trình duyệt cũ không có IntersectionObserver -> hiện tất cả ngay.
     - Phần tử đã nằm trong màn hình lúc tải -> hiện ngay.
     - Sau 2.5 giây, phần tử nào ở gần màn hình mà chưa hiện -> ép hiện.
   ===================================================================== */
(function () {
  "use strict";

  function init() {
    var items = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

    // Bật chế độ hiệu ứng: CSS chỉ làm mờ khi <html> có class "anim".
    document.documentElement.classList.add("anim");

    function show(el) { el.classList.add("in"); }

    // Trình duyệt quá cũ: bỏ hiệu ứng, hiện hết.
    if (!("IntersectionObserver" in window)) { items.forEach(show); return; }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          show(entry.target);
          observer.unobserve(entry.target);   // hiện một lần là đủ, thôi theo dõi
        }
      });
    }, {
      threshold: 0.12,                        // hiện khi thấy được 12% phần tử
      rootMargin: "0px 0px -6% 0px"           // kích hoạt hơi sớm trước khi chạm đáy màn hình
    });

    items.forEach(function (el) {
      // Đã nằm sẵn trong màn hình -> hiện luôn, không cần chờ.
      if (el.getBoundingClientRect().top < window.innerHeight) show(el);
      else observer.observe(el);
    });

    // Lưới an toàn: phần tử gần màn hình mà vẫn chưa hiện thì ép hiện.
    setTimeout(function () {
      items.forEach(function (el) {
        if (!el.classList.contains("in") &&
            el.getBoundingClientRect().top < window.innerHeight * 1.5) show(el);
      });
    }, 2500);
  }

  TetApp.reveal = { init: init };
})();

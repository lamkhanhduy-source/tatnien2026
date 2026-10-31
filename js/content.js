/* =====================================================================
   content.js - ĐỔ NỘI DUNG TĨNH VÀO TRANG
   ---------------------------------------------------------------------
   Đọc TetApp.CONFIG rồi điền vào các ô trống trong index.html:
     - tên nhóm, ngày, giờ, địa điểm, trang phục
     - nút "Xem bản đồ" và nút "Sao chép địa chỉ"
     - danh sách chương trình (timeline)
     - thư viện ảnh (gallery)
   Chạy một lần khi trang tải (được main.js gọi: TetApp.content.init()).
   ===================================================================== */
(function () {
  "use strict";
  var u = TetApp.utils, $ = u.$;

  /** Điền thông tin sự kiện vào các thẻ có id tương ứng. */
  function fillEventInfo() {
    var C = TetApp.CONFIG, when = u.eventDate();

    $("groupName").textContent = C.groupName;

    // Intl.DateTimeFormat: định dạng ngày giờ theo tiếng Việt, đúng múi giờ VN.
    var weekday = new Intl.DateTimeFormat("vi-VN", { weekday: "long", timeZone: u.TZ });
    var fullDay = new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "long", year: "numeric", timeZone: u.TZ });
    var clock   = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: u.TZ });

    $("evDate").textContent    = weekday.format(when);   // "thứ bảy"
    $("evDateSub").textContent = fullDay.format(when);   // "30 tháng 1, 2027"
    $("evTime").textContent    = clock.format(when);     // "18:00"
    $("evTimeSub").textContent = "Đón khách từ " + C.doorsOpen;

    $("evVenue").textContent   = C.venue;
    $("evAddress").textContent = C.address;
    $("evDress").textContent   = C.dress;
    $("evDressSub").textContent = C.dressSub;

    // Nút bản đồ: đường link tìm kiếm Google Maps theo "tên + địa chỉ".
    // encodeURIComponent đổi ký tự đặc biệt/dấu tiếng Việt thành dạng an toàn trong URL.
    $("mapBtn").href = "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(C.venue + ", " + C.address);
  }

  /** Nút "Sao chép địa chỉ". */
  function wireCopyButton() {
    var btn = $("copyAddr");
    btn.addEventListener("click", function () {
      var C = TetApp.CONFIG;
      var text = C.venue + ", " + C.address;

      // Kết quả hiển thị trên nút trong 2.2 giây rồi trả về chữ cũ.
      function flash(label) {
        btn.textContent = label;
        setTimeout(function () { btn.textContent = "Sao chép địa chỉ"; }, 2200);
      }

      // Cách 1: Clipboard API (hiện đại, cần https hoặc localhost).
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          function () { flash("Đã sao chép"); },
          function () { selectAddressText(); flash("Hãy chép phần đã chọn"); }
        );
      } else {
        // Cách 2 (dự phòng): bôi đen địa chỉ để người dùng tự chép.
        selectAddressText();
        flash("Hãy chép phần đã chọn");
      }
    });
  }

  /** Bôi đen đoạn địa chỉ trên trang (dùng khi không sao chép tự động được). */
  function selectAddressText() {
    var range = document.createRange();
    range.selectNodeContents($("evAddress"));
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /** Tạo danh sách chương trình: mỗi mục = giờ + chấm + tên + mô tả. */
  function renderTimeline() {
    var list = $("timeline");
    list.textContent = "";
    TetApp.CONFIG.program.forEach(function (item) {
      var li = document.createElement("li");

      var time = document.createElement("time");
      time.textContent = item.t;

      var dot = document.createElement("span");
      dot.className = "dot";

      var box = document.createElement("div");
      var title = document.createElement("h3");
      title.textContent = item.h;
      var desc = document.createElement("p");
      desc.textContent = item.p;
      box.append(title, desc);

      li.append(time, dot, box);
      list.append(li);
    });
  }

  // Các bộ màu cho ô ảnh khi chưa có ảnh thật: [màu đầu, màu cuối, màu nhấn].
  var PALETTES = [
    ["#7a1627", "#2a0a12", "#d8b46e"],
    ["#3a0d14", "#8e1f31", "#f3e4c2"],
    ["#5a1220", "#16060a", "#c19a4f"],
    ["#8e1f31", "#3a0d14", "#e4c37f"],
    ["#2a0a12", "#6f1424", "#d8b46e"],
    ["#a02438", "#2a0a12", "#f3e4c2"]
  ];

  /** Tạo lưới ảnh. Có src -> dùng ảnh thật; không có -> vẽ nền màu bằng CSS. */
  function renderGallery() {
    var grid = $("gallery");
    grid.textContent = "";

    TetApp.CONFIG.gallery.forEach(function (item, i) {
      var fig = document.createElement("figure");
      fig.className = "tile";

      if (item.src) {
        // Ảnh thật. loading="lazy": chỉ tải khi sắp cuộn tới -> trang nhẹ hơn.
        var img = document.createElement("img");
        img.src = item.src;
        img.alt = item.cap;
        img.loading = "lazy";
        fig.append(img);
      } else {
        // Nền màu: hai quầng sáng + gradient chéo, vị trí khác nhau cho mỗi ô.
        var p = PALETTES[i % PALETTES.length], a = p[0], b = p[1], c = p[2];
        var art = document.createElement("div");
        art.className = "art";
        art.style.background =
          "radial-gradient(circle at " + (25 + (i * 17) % 55) + "% " + (22 + (i * 11) % 30) + "%, " + c + "55 0, transparent 38%)," +
          "radial-gradient(circle at " + (80 - (i * 13) % 40) + "% 85%, " + c + "33 0, transparent 45%)," +
          "linear-gradient(155deg," + a + "," + b + ")";
        fig.append(art);
      }

      // Chú thích đè lên đáy ô (dòng nhỏ + tiêu đề)
      var cap = document.createElement("figcaption");
      var small = document.createElement("small");
      small.textContent = item.label;
      var span = document.createElement("span");
      span.textContent = item.cap;
      cap.append(small, span);
      fig.append(cap);

      grid.append(fig);
    });
  }

  /** Hàm khởi tạo: gọi tất cả bước trên. */
  function init() {
    fillEventInfo();
    wireCopyButton();
    renderTimeline();
    renderGallery();
  }

  TetApp.content = { init: init };
})();

/* =====================================================================
   countdown.js - ĐỒNG HỒ ĐẾM NGƯỢC TỚI NGÀY TIỆC
   ---------------------------------------------------------------------
   Mỗi giây tính số giây còn lại giữa "bây giờ" và TetApp.CONFIG.eventISO,
   rồi đổi ra Ngày / Giờ / Phút / Giây và ghi vào 4 ô trong index.html.
   Khi hết giờ: hiện 00 và đổi dòng ghi chú; đồng hồ tự dừng.
   ===================================================================== */
(function () {
  "use strict";
  var u = TetApp.utils, $ = u.$;

  function init() {
    // 4 ô hiển thị số
    var cells = { d: $("cd-d"), h: $("cd-h"), m: $("cd-m"), s: $("cd-s") };
    var note = $("countNote");
    var target = u.eventDate();

    // Dòng ghi chú phía dưới: "Đến thứ bảy, 30/1/2027 18:00 (giờ Việt Nam)"
    var label = new Intl.DateTimeFormat("vi-VN", {
      weekday: "long", day: "numeric", month: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false, timeZone: u.TZ
    }).format(target);
    note.textContent = "Đến " + label + " (giờ Việt Nam)";

    /**
     * Cập nhật 4 ô một lần.
     * Trả về true nếu còn đếm tiếp, false nếu tiệc đã bắt đầu.
     */
    function tick() {
      // Số giây còn lại (làm tròn xuống)
      var diff = Math.floor((target.getTime() - Date.now()) / 1000);

      if (diff <= 0) {                       // Hết giờ
        Object.keys(cells).forEach(function (k) { cells[k].textContent = "00"; });
        note.textContent = "Tiệc đã bắt đầu. Cảm ơn mọi người đã đến!";
        return false;
      }

      // Tách giây còn lại thành ngày / giờ / phút / giây
      var days = Math.floor(diff / 86400);  diff -= days * 86400;
      var hours = Math.floor(diff / 3600);  diff -= hours * 3600;
      var mins = Math.floor(diff / 60);
      var secs = diff - mins * 60;

      // Ngày có thể trên 99 -> không ép 2 chữ số khi quá lớn
      cells.d.textContent = days > 99 ? String(days) : u.pad(days);
      cells.h.textContent = u.pad(hours);
      cells.m.textContent = u.pad(mins);
      cells.s.textContent = u.pad(secs);
      return true;
    }

    // Vẽ ngay lần đầu (khỏi chờ 1 giây), rồi lặp mỗi giây cho tới khi hết giờ.
    if (tick()) {
      var timer = setInterval(function () {
        if (!tick()) clearInterval(timer);
      }, 1000);
    }
  }

  TetApp.countdown = { init: init };
})();

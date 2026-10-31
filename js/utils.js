/* =====================================================================
   utils.js - HÀM TIỆN ÍCH DÙNG CHUNG
   ---------------------------------------------------------------------
   Những hàm nhỏ, không phụ thuộc giao diện, được nhiều file dùng lại.
   Truy cập qua TetApp.utils (vd: TetApp.utils.pad(5) -> "05").
   ===================================================================== */
(function () {
  "use strict";

  // Múi giờ dùng để hiển thị ngày giờ sự kiện (luôn giờ Việt Nam).
  var TZ = "Asia/Ho_Chi_Minh";

  /** Rút gọn document.getElementById. */
  function $(id) { return document.getElementById(id); }

  /** Thêm số 0 phía trước: 5 -> "05". Dùng cho đồng hồ đếm ngược. */
  function pad(n) { return String(n).padStart(2, "0"); }

  /** Thời điểm diễn ra sự kiện dưới dạng đối tượng Date (đọc từ config). */
  function eventDate() { return new Date(TetApp.CONFIG.eventISO); }

  /**
   * Đổi mốc thời gian (mili-giây) thành chữ "vừa xong", "5 phút trước"...
   * Quá 7 ngày thì hiện ngày tháng đầy đủ.
   */
  function ago(ts) {
    if (!ts) return "";
    var s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (s < 45) return "Vừa xong";
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + " phút trước";
    if (s < 86400) return Math.round(s / 3600) + " giờ trước";
    if (s < 86400 * 7) return Math.round(s / 86400) + " ngày trước";
    return new Intl.DateTimeFormat("vi-VN", {
      day: "numeric", month: "numeric", year: "numeric", timeZone: TZ
    }).format(new Date(ts));
  }

  // Bảng màu nền cho ảnh đại diện tròn (tông vàng/hồng ấm hợp giao diện).
  var AVATAR_COLORS = ["#d8b46e", "#e4c37f", "#f3e4c2", "#c9857f", "#e0a96d"];

  /**
   * Chọn màu ảnh đại diện từ id người dùng.
   * Cùng một id luôn ra cùng một màu (băm chuỗi thành số rồi chia dư).
   */
  function colorFor(id) {
    var h = 0;
    for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
  }

  /** Tạo id ngẫu nhiên (dùng khi chạy chế độ "local" hoặc "supabase"). */
  function randomId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  // Xuất ra để file khác dùng
  TetApp.utils = {
    TZ: TZ, $: $, pad: pad, eventDate: eventDate,
    ago: ago, colorFor: colorFor, randomId: randomId
  };
})();

/* =====================================================================
   config.js - CẤU HÌNH THƯ MỜI (file DUY NHẤT bạn cần sửa để đổi nội dung)
   ---------------------------------------------------------------------
   File này nạp ĐẦU TIÊN. Nó tạo đối tượng chung `TetApp` rồi gắn cấu hình
   vào TetApp.CONFIG. Các file js khác chỉ ĐỌC cấu hình này.
   ===================================================================== */

// Tạo (hoặc dùng lại) đối tượng chung chứa mọi module của trang.
window.TetApp = window.TetApp || {};

TetApp.CONFIG = {

  /* ---------- 1. THÔNG TIN SỰ KIỆN ---------- */

  // Tên đơn vị / nhóm hiển thị phía trên tiêu đề (vd: "Công ty ABC").
  groupName: "Đại gia đình",

  // Ngày giờ diễn ra tiệc, theo chuẩn ISO 8601.
  // "+07:00" = giờ Việt Nam. Đồng hồ đếm ngược dựa vào đúng mốc này,
  // nên khách ở múi giờ nào cũng thấy đếm đúng.
  eventISO: "2027-01-30T18:00:00+07:00",

  // Giờ bắt đầu đón khách (chỉ để hiển thị).
  doorsOpen: "17:30",

  // Tên địa điểm và địa chỉ. Hai giá trị này cũng được ghép lại để tạo
  // nút "Xem bản đồ" (mở Google Maps tìm đúng địa điểm).
  venue: "Sảnh tiệc Hoa Mai",
  address: "Tầng 3, 123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",

  // Gợi ý trang phục (dòng lớn) và lời nhắn nhỏ bên dưới.
  dress: "Áo dài, vest hoặc màu đỏ và vàng",
  dressSub: "Một chút sắc đỏ cho năm mới thêm may mắn",

  /* ---------- 2. CHƯƠNG TRÌNH ----------
     Mỗi mục: t = giờ, h = tên phần, p = mô tả ngắn.
     Thêm/xóa/sửa tùy ý, trang tự vẽ lại theo danh sách. */
  program: [
    { t: "17:30", h: "Đón khách",            p: "Check-in, nhận quà lưu niệm và chụp ảnh tại phông nền." },
    { t: "18:00", h: "Khai tiệc",            p: "Lời chào mừng và nâng ly đầu tiên." },
    { t: "19:00", h: "Nhìn lại năm 2026",    p: "Những con số, những cột mốc và lời cảm ơn." },
    { t: "19:45", h: "Văn nghệ và trò chơi", p: "Các tiết mục của từng nhóm và phần chơi chung." },
    { t: "20:30", h: "Bốc thăm may mắn",     p: "Quà tặng đầu năm cho những người may mắn." },
    { t: "21:30", h: "Ảnh lưu niệm",         p: "Chụp ảnh tập thể trước khi chia tay." }
  ],

  /* ---------- 3. THƯ VIỆN ẢNH ----------
     label = dòng nhỏ (thời gian), cap = tiêu đề ảnh,
     src   = đường dẫn ảnh, ví dụ "images/anh1.jpg".
     Để src là "" thì trang hiện nền màu trang trí thay cho ảnh.
     Ô đầu tiên được hiển thị lớn gấp đôi. */
  gallery: [
    { label: "Tháng 1 – 2", cap: "Khởi động đầu năm",  src: "" },
    { label: "Tháng 4",     cap: "Chuyến đi gắn kết",  src: "" },
    { label: "Tháng 6",     cap: "Giữa năm bứt tốc",   src: "" },
    { label: "Tháng 8",     cap: "Ngày hội chung",     src: "" },
    { label: "Tháng 10",    cap: "Tăng tốc về đích",   src: "" },
    { label: "Tháng 12",    cap: "Tổng kết năm",       src: "" }
  ],

  /* ---------- 4. NƠI LƯU DỮ LIỆU RSVP + LỜI CHÚC ----------
     provider chọn một trong ba:
       "local"    : lưu trong trình duyệt của CHÍNH MÁY NÀY (localStorage).
                    Dùng để xem thử/chạy demo. KHÔNG đồng bộ giữa các thiết bị.
       "supabase" : lưu lên Supabase, đồng bộ trực tiếp mọi thiết bị.
                    Điền url + anonKey bên dưới (xem README.md để tạo).
       "claude"   : chỉ dùng khi dán trang này vào Claude Artifact
                    (dùng cơ sở dữ liệu có sẵn của Claude). */
  provider: "local",

  supabase: {
    url: "https://itxnntcfxjmxhcjxszhn.supabase.co",        // ví dụ: "https://abcdxyz.supabase.co"
    anonKey: "sb_publishable_35slWoMPmTScEEvS57XJ3Q_ikiOLbd0",    // khóa "anon public" trong Project Settings > API
    table: "rsvps"  // tên bảng (tạo bằng đoạn SQL trong README.md)
  }
};

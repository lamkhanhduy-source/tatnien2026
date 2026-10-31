/* =====================================================================
   rsvp.js - FORM XÁC NHẬN THAM DỰ + TƯỜNG LỜI CHÚC TRỰC TIẾP
   ---------------------------------------------------------------------
   Gồm hai nửa:
     A. FORM  : thu thập tên, tình trạng tham dự, số người, lời chúc,
                kiểm tra hợp lệ rồi gửi qua adapter (data.js).
     B. TƯỜNG : lắng nghe dữ liệu từ adapter và vẽ lại thống kê + danh sách
                mỗi khi có thay đổi (đây là phần "đồng bộ trực tiếp").
   File này KHÔNG biết dữ liệu lưu ở đâu; nó chỉ dùng 4 hàm của adapter.
   ===================================================================== */
(function () {
  "use strict";
  var u = TetApp.utils, $ = u.$;

  /* ---------------------------------------------------------------
     TRẠNG THÁI CHUNG
     --------------------------------------------------------------- */
  var adapter = null;       // adapter đang dùng (local / supabase / claude)
  var session = { ready: false, myId: null, canWrite: null, isAdmin: false };
  var entries = [];         // danh sách bản ghi mới nhất từ adapter
  var knownIds = null;      // tập id đã hiển thị (để nhận biết lời chúc MỚI). null = chưa vẽ lần nào
  var guests = 1;           // số người tham dự đang chọn trong form
  var formTouched = false;  // người dùng đã gõ vào form chưa (để không ghi đè khi điền sẵn)

  // Các phần tử trang dùng nhiều lần
  var form, msg, submitBtn, wall;

  /* ---------------------------------------------------------------
     A. FORM
     --------------------------------------------------------------- */

  /** Hiện dòng thông báo dưới form. kind: "ok" (xanh) | "err" (đỏ) | rỗng (xám). */
  function setMsg(text, kind) {
    msg.textContent = text || "";
    msg.className = "msg" + (kind ? " " + kind : "");
  }

  /** Đặt số người (giới hạn 1..10) và cập nhật số hiển thị. */
  function setGuests(n) {
    guests = Math.max(1, Math.min(10, n));
    $("f-guests-out").textContent = String(guests);
  }

  /** Lấy tình trạng đang chọn: "yes" hoặc "no". */
  function currentStatus() { return form.elements.status.value; }

  /** Chọn "Không thể tham dự" thì ẩn ô số người (vì không đi). */
  function syncGuestsVisibility() { $("guestsField").hidden = currentStatus() !== "yes"; }

  /** Khóa nút gửi và giải thích lý do nếu chưa gửi được. */
  function applyWritePermission() {
    var blocked = !session.ready || !session.myId || session.canWrite === false;
    submitBtn.disabled = blocked;
    if (!session.ready) {
      setMsg(TetApp.CONFIG.provider === "supabase"
        ? "Chưa kết nối được máy chủ dữ liệu. Kiểm tra url và anonKey trong js/config.js."
        : "Chưa kết nối được dữ liệu chung. Hãy mở lại thư mời trong môi trường được hỗ trợ.", "err");
    } else if (!session.myId) {
      setMsg("Không nhận diện được tài khoản của bạn nên chưa thể gửi xác nhận.", "err");
    } else if (session.canWrite === false) {
      setMsg("Tài khoản của bạn hiện chỉ có quyền xem. Nhờ người gửi thư mời cấp quyền ghi để gửi lời chúc.", "err");
    }
  }

  /** Điền sẵn form bằng xác nhận cũ của chính người này (nếu họ từng gửi). */
  function prefillMine() {
    if (formTouched || !session.myId) return;               // không ghi đè khi đang gõ dở
    var mine = null;
    entries.forEach(function (e) { if (e.id === session.myId) mine = e; });
    if (!mine) return;

    $("f-name").value = mine.name || "";
    $("f-wish").value = mine.wish || "";
    $("wishCount").textContent = String($("f-wish").value.length);
    (mine.status === "no" ? $("f-no") : $("f-yes")).checked = true;
    setGuests(Number(mine.guests) || 1);
    syncGuestsVisibility();
    submitBtn.textContent = "Cập nhật xác nhận";            // đã gửi rồi -> nút đổi thành "Cập nhật"
  }

  /** Xử lý khi bấm "Gửi xác nhận". */
  function onSubmit(ev) {
    ev.preventDefault();                                    // chặn trang tải lại

    // Lấy và làm sạch dữ liệu (cắt khoảng trắng thừa, giới hạn độ dài)
    var name = $("f-name").value.trim().slice(0, 60);
    var status = currentStatus();
    var wish = $("f-wish").value.trim().slice(0, 300);

    // Kiểm tra: bắt buộc có tên
    if (!name) {
      setMsg("Vui lòng nhập họ và tên.", "err");
      $("f-name").focus();
      return;
    }
    if (!session.ready || !session.myId) { applyWritePermission(); return; }

    submitBtn.disabled = true;                              // chống bấm trùng
    setMsg("Đang gửi...", "");

    adapter.save({ name: name, status: status, guests: status === "yes" ? guests : 0, wish: wish })
      .then(function () {
        setMsg(status === "yes"
          ? "Đã nhận xác nhận của bạn. Hẹn gặp bạn tại tiệc!"
          : "Đã ghi nhận. Cảm ơn bạn đã báo trước.", "ok");
        submitBtn.textContent = "Cập nhật xác nhận";
        formTouched = false;
      })
      .catch(function (err) {
        // Dịch mã lỗi chuẩn của adapter sang câu tiếng Việt dễ hiểu
        var code = err && err.code;
        if (code === "permission") { session.canWrite = false; applyWritePermission(); }
        else if (code === "quota") setMsg("Sổ lưu bút đã đầy. Vui lòng báo người tổ chức.", "err");
        else if (code === "rate") setMsg("Bạn gửi hơi nhanh. Thử lại sau vài giây.", "err");
        else setMsg("Chưa gửi được. Kiểm tra kết nối và thử lại.", "err");
      })
      .then(function () {
        // Dù thành công hay lỗi, mở lại nút nếu vẫn được phép gửi
        if (session.ready && session.myId && session.canWrite !== false) submitBtn.disabled = false;
      });
  }

  /** Gắn các sự kiện cho form. */
  function wireForm() {
    $("g-minus").addEventListener("click", function () { setGuests(guests - 1); });
    $("g-plus").addEventListener("click", function () { setGuests(guests + 1); });

    // Đổi lựa chọn tham dự -> ẩn/hiện ô số người
    Array.prototype.forEach.call(form.elements.status, function (radio) {
      radio.addEventListener("change", syncGuestsVisibility);
    });

    // Bộ đếm ký tự lời chúc
    $("f-wish").addEventListener("input", function () {
      $("wishCount").textContent = String($("f-wish").value.length);
    });

    // Đánh dấu người dùng đã tương tác (để prefillMine không ghi đè)
    form.addEventListener("input", function () { formTouched = true; });

    form.addEventListener("submit", onSubmit);
    syncGuestsVisibility();
  }

  /* ---------------------------------------------------------------
     B. TƯỜNG LỜI CHÚC
     --------------------------------------------------------------- */

  /** Cập nhật chấm "Cập nhật trực tiếp" (xanh nhấp nháy) / xám. */
  function setLive(isOn, text) {
    $("liveTag").classList.toggle("off", !isOn);
    $("liveText").textContent = text;
  }

  /** Tính và hiển thị 3 số thống kê. */
  function renderStats() {
    // Tổng số người tham dự = cộng "số người" của những ai chọn "yes"
    var people = entries
      .filter(function (e) { return e.status === "yes"; })
      .reduce(function (sum, e) { return sum + (Number(e.guests) || 1); }, 0);
    var wishes = entries.filter(function (e) { return (e.wish || "").trim(); }).length;

    $("st-people").textContent = String(people);
    $("st-replies").textContent = String(entries.length);
    $("st-wishes").textContent = String(wishes);
  }

  /** Tạo thẻ HTML cho MỘT lời chúc. Dùng textContent (không innerHTML) để
      chữ do khách nhập không thể chèn mã độc vào trang (chống XSS). */
  function buildEntry(e, isFresh) {
    var li = document.createElement("li");
    li.className = "entry" + (isFresh ? " fresh" : "");

    // Ảnh đại diện: chữ cái đầu của tên, màu chọn theo id
    var av = document.createElement("div");
    av.className = "av";
    av.style.background = u.colorFor(e.id);
    av.textContent = ((e.name || "?").trim()[0] || "?").toUpperCase();

    var body = document.createElement("div");
    body.style.minWidth = "0";

    // Dòng trên: tên + nhãn tình trạng
    var top = document.createElement("div");
    top.className = "top";
    var who = document.createElement("span");
    who.className = "who";
    who.textContent = e.name || "Khách mời";
    var chip = document.createElement("span");
    chip.className = "chip " + (e.status === "yes" ? "yes" : "no");
    chip.textContent = e.status === "yes" ? "Tham dự · " + (Number(e.guests) || 1) + " người" : "Không thể tham dự";
    top.append(who, chip);
    body.append(top);

    // Lời chúc (chỉ hiện nếu có viết)
    if ((e.wish || "").trim()) {
      var wish = document.createElement("p");
      wish.className = "wish";
      wish.textContent = e.wish;
      body.append(wish);
    }

    // Dòng dưới: thời gian + (nếu là quản trị) nút Xóa
    var when = document.createElement("div");
    when.className = "when";
    var time = document.createElement("span");
    time.textContent = u.ago(e.ts);
    when.append(time);

    if (session.isAdmin) {
      var del = document.createElement("button");
      del.type = "button";
      del.className = "del";
      del.textContent = "Xóa";
      del.addEventListener("click", function () {
        // Cần bấm 2 lần để xóa (trang không hiện được hộp thoại xác nhận)
        if (del.dataset.armed !== "1") {
          del.dataset.armed = "1";
          del.textContent = "Bấm lần nữa để xóa";
          setTimeout(function () { del.dataset.armed = ""; del.textContent = "Xóa"; }, 3000);
          return;
        }
        adapter.remove(e.id).catch(function () { setMsg("Không xóa được mục này.", "err"); });
      });
      when.append(del);
    }

    body.append(when);
    li.append(av, body);
    return li;
  }

  /** Vẽ lại toàn bộ tường lời chúc + thống kê. */
  function renderWall() {
    renderStats();

    var keepScroll = wall.scrollTop;     // nhớ vị trí cuộn để không bị giật về đầu
    wall.textContent = "";

    // Chưa có ai gửi: hiện ô trống hướng dẫn
    if (!entries.length) {
      var empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent = session.ready
        ? "Chưa có lời chúc nào. Hãy là người đầu tiên gửi xác nhận và lời chúc."
        : "Chưa kết nối được sổ lưu bút.";
      wall.append(empty);
      return;
    }

    var firstPaint = knownIds === null;  // lần vẽ đầu: không đánh dấu "mới"
    var nextKnown = {};
    entries.forEach(function (e) {
      nextKnown[e.id] = true;
      var isFresh = !firstPaint && !knownIds[e.id];   // id chưa từng thấy -> lời chúc mới
      wall.append(buildEntry(e, isFresh));
    });
    knownIds = nextKnown;
    wall.scrollTop = keepScroll;
  }

  /** Bắt đầu lắng nghe dữ liệu từ adapter. */
  function startListening() {
    // Nếu 10 giây vẫn chưa có dữ liệu xác nhận -> báo cho người dùng biết.
    var slowTimer = setTimeout(function () { setLive(false, "Chưa tải được dữ liệu"); }, 10000);
    setLive(false, "Đang tải");

    adapter.subscribe(
      // Có dữ liệu mới
      function (list, live) {
        entries = list;
        if (live) { clearTimeout(slowTimer); setLive(true, "Cập nhật trực tiếp"); }
        renderWall();
        prefillMine();
      },
      // Có lỗi
      function (code) {
        clearTimeout(slowTimer);
        setLive(false, code === "permission" ? "Hết quyền truy cập" : "Mất kết nối");
      }
    );
  }

  /* ---------------------------------------------------------------
     KHỞI ĐỘNG
     --------------------------------------------------------------- */
  function init() {
    form = $("rsvpForm");
    msg = $("formMsg");
    submitBtn = $("submitBtn");
    wall = $("wall");

    wireForm();
    adapter = TetApp.data.pick();

    adapter.init().then(function (s) {
      session = s;
      applyWritePermission();

      if (!session.ready) {            // không kết nối được: vẽ tường trống rồi dừng
        renderWall();
        setLive(false, "Chưa kết nối");
        return;
      }
      startListening();
    });

    // Làm mới chữ "5 phút trước" mỗi phút mà không cần tải lại dữ liệu.
    setInterval(function () { if (entries.length) renderWall(); }, 60000);
  }

  TetApp.rsvp = { init: init };
})();

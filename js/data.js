/* =====================================================================
   data.js - LỚP LƯU DỮ LIỆU (RSVP + LỜI CHÚC)
   ---------------------------------------------------------------------
   Mục đích: tách riêng "chỗ lưu dữ liệu" khỏi giao diện. File rsvp.js chỉ
   nói chuyện với một giao diện chung (adapter) gồm 4 hàm, không cần biết
   dữ liệu thực sự nằm ở đâu. Muốn đổi nơi lưu chỉ cần đổi
   TetApp.CONFIG.provider trong config.js.

   GIAO DIỆN CHUNG của mỗi adapter:
     init()                      -> Promise<{ ready, myId, canWrite, isAdmin }>
         ready    : true nếu kết nối được nơi lưu
         myId     : id của người đang xem (mỗi người một bản ghi), hoặc null
         canWrite : true / false / null (null = chưa biết, cứ thử gửi)
         isAdmin  : true nếu được phép xóa lời chúc của người khác
     subscribe(onData, onError) -> hàm hủy đăng ký
         onData(entries, live)   : gọi mỗi khi danh sách thay đổi;
                                   entries sắp mới nhất trước,
                                   live = true khi dữ liệu đã xác nhận từ máy chủ
         onError(code)           : gọi khi mất kết nối / hết quyền
     save({ name, status, guests, wish }) -> Promise   (tự thêm id + thời gian)
     remove(id)                  -> Promise            (xóa một bản ghi)

   MỖI BẢN GHI (entry) có dạng:
     { id, name, status: "yes" | "no", guests: số, wish: chữ, ts: mili-giây }

   MÃ LỖI chuẩn hóa khi save/remove thất bại (đối tượng { code }):
     "permission" : không có quyền ghi
     "quota"      : kho dữ liệu đầy
     "rate"       : gửi quá nhanh
     "network"    : lỗi mạng / máy chủ
   ===================================================================== */
(function () {
  "use strict";
  var u = TetApp.utils;

  /* ===================================================================
     ADAPTER 1: "local" - lưu trong localStorage của chính trình duyệt này
     Dùng để xem thử. Dữ liệu KHÔNG sang được thiết bị khác.
     (Hai tab cùng trình duyệt vẫn thấy nhau nhờ sự kiện "storage".)
     =================================================================== */
  var LocalAdapter = (function () {
    var KEY = "tet2026.rsvps";   // nơi lưu toàn bộ bản ghi
    var ME = "tet2026.me";       // id của người dùng này

    /** Đọc toàn bộ bản ghi (đối tượng id -> entry). */
    function readAll() {
      try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
      catch (e) { return {}; }
    }
    function writeAll(map) { localStorage.setItem(KEY, JSON.stringify(map)); }

    /** Lấy id đã lưu hoặc tạo mới và lưu lại. */
    function myId() {
      var id = null;
      try { id = localStorage.getItem(ME); } catch (e) {}
      if (!id) {
        id = u.randomId();
        try { localStorage.setItem(ME, id); } catch (e) {}
      }
      return id;
    }

    /** Biến đối tượng id->entry thành mảng sắp mới nhất trước. */
    function toList(map) {
      return Object.keys(map)
        .map(function (id) { return map[id]; })
        .sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    }

    var listeners = [];
    function emit() { var list = toList(readAll()); listeners.forEach(function (fn) { fn(list, true); }); }

    // Tab khác thay đổi dữ liệu -> cập nhật tab này.
    window.addEventListener("storage", function (e) { if (e.key === KEY) emit(); });

    return {
      name: "local",
      init: function () {
        return Promise.resolve({ ready: true, myId: myId(), canWrite: true, isAdmin: true });
      },
      subscribe: function (onData) {
        listeners.push(onData);
        onData(toList(readAll()), true);   // phát dữ liệu hiện có ngay lập tức
        return function () { listeners = listeners.filter(function (f) { return f !== onData; }); };
      },
      save: function (data) {
        var map = readAll(), id = myId();
        map[id] = { id: id, name: data.name, status: data.status, guests: data.guests, wish: data.wish, ts: Date.now() };
        try { writeAll(map); } catch (e) { return Promise.reject({ code: "quota" }); }
        emit();
        return Promise.resolve();
      },
      remove: function (id) {
        var map = readAll();
        delete map[id];
        writeAll(map);
        emit();
        return Promise.resolve();
      }
    };
  })();

  /* ===================================================================
     ADAPTER 2: "supabase" - dữ liệu chung, đồng bộ trực tiếp mọi thiết bị
     Cần: project Supabase + bảng (xem SQL trong README.md) + điền url/anonKey.
     Thư viện supabase-js được nạp tự động từ CDN khi cần.

     Cách đồng bộ trực tiếp: đăng ký kênh "postgres_changes" của Supabase
     Realtime; mỗi khi bảng có thay đổi, ta tải lại danh sách.
     =================================================================== */
  var SupabaseAdapter = (function () {
    var client = null;                    // đối tượng kết nối Supabase
    var myIdValue = null;
    var LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";

    /** Nạp thư viện supabase-js bằng cách chèn thẻ <script>. */
    function loadLibrary() {
      if (window.supabase && window.supabase.createClient) return Promise.resolve();
      return new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = LIB;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }

    /** Đổi lỗi của Supabase sang mã lỗi chuẩn của ta. */
    function mapError(err) {
      var status = err && (err.status || err.code);
      if (status === 401 || status === 403 || status === "42501") return { code: "permission" };
      if (status === 429) return { code: "rate" };
      return { code: "network" };
    }

    function table() { return TetApp.CONFIG.supabase.table || "rsvps"; }

    /** Tải toàn bộ danh sách (mới nhất trước, tối đa 300). */
    function fetchAll() {
      return client.from(table()).select("*").order("ts", { ascending: false }).limit(300)
        .then(function (res) {
          if (res.error) throw res.error;
          return res.data || [];
        });
    }

    return {
      name: "supabase",
      init: function () {
        var cfg = TetApp.CONFIG.supabase;
        if (!cfg.url || !cfg.anonKey) return Promise.resolve({ ready: false, myId: null, canWrite: false, isAdmin: false });

        return loadLibrary().then(function () {
          client = window.supabase.createClient(cfg.url, cfg.anonKey);
          // Khách không cần đăng nhập: dùng id ngẫu nhiên lưu trong trình duyệt
          // để lần sau mở lại vẫn sửa được xác nhận của chính mình.
          try { myIdValue = localStorage.getItem("tet2026.me"); } catch (e) {}
          if (!myIdValue) {
            myIdValue = u.randomId();
            try { localStorage.setItem("tet2026.me", myIdValue); } catch (e) {}
          }
          // isAdmin = false: việc xóa lời chúc làm trong bảng điều khiển Supabase.
          return { ready: true, myId: myIdValue, canWrite: true, isAdmin: false };
        }).catch(function () {
          return { ready: false, myId: null, canWrite: false, isAdmin: false };
        });
      },
      subscribe: function (onData, onError) {
        var closed = false, pending = false;

        // Tải danh sách, gộp nhiều thay đổi dồn dập thành một lần tải.
        function refresh() {
          if (pending || closed) return;
          pending = true;
          setTimeout(function () {
            pending = false;
            fetchAll().then(function (rows) { if (!closed) onData(rows, true); },
                            function () { if (!closed) onError("network"); });
          }, 150);
        }

        refresh();                        // tải lần đầu

        // Đăng ký nhận thay đổi theo thời gian thực
        var channel = client.channel("rsvps-live")
          .on("postgres_changes", { event: "*", schema: "public", table: table() }, refresh)
          .subscribe(function (status) {
            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") onError("network");
          });

        // Dự phòng: nếu kênh realtime bị chặn, vẫn làm mới mỗi 20 giây.
        var poll = setInterval(refresh, 20000);

        return function () { closed = true; clearInterval(poll); client.removeChannel(channel); };
      },
      save: function (data) {
        // upsert = thêm mới nếu chưa có id này, ngược lại ghi đè -> mỗi người đúng một bản ghi.
        return client.from(table()).upsert({
          id: myIdValue, name: data.name, status: data.status,
          guests: data.guests, wish: data.wish, ts: Date.now()
        }, { onConflict: "id" }).then(function (res) {
          if (res.error) throw mapError(res.error);
        });
      },
      remove: function (id) {
        return client.from(table()).delete().eq("id", id).then(function (res) {
          if (res.error) throw mapError(res.error);
        });
      }
    };
  })();

  /* ===================================================================
     ADAPTER 3: "claude" - chỉ chạy khi trang nằm trong Claude Artifact
     Dùng kho dữ liệu chung có sẵn của Claude (window.claude.use("db")).
     Người xem cần đăng nhập Claude và được cấp quyền Cộng tác viên để gửi.
     Ngoài môi trường Artifact, adapter này báo ready = false.
     =================================================================== */
  var ClaudeAdapter = (function () {
    var db = null, userApi = null, myIdValue = null;

    function mapError(err) {
      var c = err && err.code;
      if (c === "invalid_argument") return { code: "permission" };
      if (c === "quota_exceeded") return { code: "quota" };
      if (c === "resource_exhausted") return { code: "rate" };
      return { code: "network" };
    }

    return {
      name: "claude",
      init: function () {
        var api = window.claude;
        if (!api || !api.use) return Promise.resolve({ ready: false, myId: null, canWrite: false, isAdmin: false });

        return Promise.all([api.use("db"), api.use("user")]).then(function (r) {
          db = r[0]; userApi = r[1];
          if (!db) return { ready: false, myId: null, canWrite: false, isAdmin: false };
          var out = { ready: true, myId: null, canWrite: null, isAdmin: false };
          if (!userApi) return out;
          return userApi.id().then(function (id) { out.myId = id; return userApi.canEdit(); })
            .then(function (a) { out.isAdmin = a; return userApi.can("data.write"); })
            .then(function (w) { out.canWrite = w; myIdValue = out.myId; return out; });
        }).catch(function () { return { ready: false, myId: null, canWrite: false, isAdmin: false }; });
      },
      subscribe: function (onData, onError) {
        return db.collection("rsvps").orderBy("ts", "desc").limit(300).onSnapshot(function (snap) {
          var list = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
          onData(list, !snap.metadata.fromCache);
        }, function (err) { onError(err && err.code === "revoked" ? "permission" : "network"); });
      },
      save: function (data) {
        return db.collection("rsvps").doc(myIdValue).set({
          name: data.name, status: data.status, guests: data.guests, wish: data.wish, ts: Date.now()
        }).catch(function (e) { throw mapError(e); });
      },
      remove: function (id) {
        return db.collection("rsvps").doc(id).delete().catch(function (e) { throw mapError(e); });
      }
    };
  })();

  /** Chọn adapter theo TetApp.CONFIG.provider. Không nhận ra -> dùng "local". */
  function pick() {
    var p = TetApp.CONFIG.provider;
    if (p === "supabase") return SupabaseAdapter;
    if (p === "claude") return ClaudeAdapter;
    return LocalAdapter;
  }

  TetApp.data = { pick: pick };
})();

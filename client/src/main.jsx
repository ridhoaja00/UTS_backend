import React, { createContext, useContext, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  NavLink,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  Building2,
  ArrowUpRight,
  ArrowRight,
  Check,
  Wifi,
  ShieldCheck,
  MapPin,
  Search,
  SlidersHorizontal,
  MoveUpRight,
  DoorOpen,
  Users,
  Wallet,
  MessageSquare,
  LogOut,
  LayoutDashboard,
  Plus,
  X,
  Menu,
  CalendarDays,
  Clock,
  Upload,
  FileText,
  Settings,
  RefreshCw,
  CheckCircle2,
  ChevronDown,
  Armchair,
  Square,
  LockKeyhole,
  Mail,
  Phone,
} from "lucide-react";
import { api, setCsrf, money, date, currentDate } from "./api";
import "./styles.css";
const Context = createContext();
export const useApp = () => useContext(Context);
const labels = {
  pending: "Menunggu pembayaran",
  active: "Sewa aktif",
  checkout_requested: "Menunggu checkout",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
  unpaid: "Belum dibayar",
  submitted: "Sedang diverifikasi",
  paid: "Lunas",
  void: "Dibatalkan",
  open: "Laporan baru",
  in_progress: "Sedang diproses",
  resolved: "Selesai",
  available: "Ditawarkan",
  maintenance: "Perawatan",
  hidden: "Disembunyikan",
};
function Badge({ status }) {
  return <span className={`badge ${status}`}>{labels[status] || status}</span>;
}
function Brand() {
  return (
    <Link className="brand" to="/">
      <span>
        <Building2 size={22} />
      </span>
      smartkos<span className="brand-dot">.</span>
    </Link>
  );
}
function Provider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [config, setConfig] = useState(null),
    [connectionError, setConnectionError] = useState(""),
    [notice, setNotice] = useState(null);
  async function refresh() {
    const data = await api("/auth/me");
    setCsrf(data.csrf);
    setUser(data.user);
    return data.user;
  }
  useEffect(() => {
    Promise.all([refresh(), api("/config").then(setConfig)])
      .catch((e) => setConnectionError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6500);
    return () => clearTimeout(t);
  }, [notice]);
  return (
    <Context.Provider
      value={{
        user,
        loading,
        config,
        refresh,
        notice: setNotice,
        connectionError,
      }}
    >
      {children}
      {notice && (
        <div className={`toast ${notice.error ? "error" : ""}`} role="status">
          {notice.error ? <X size={18} /> : <CheckCircle2 size={18} />}
          <span>{notice.message}</span>
          <button aria-label="Tutup notifikasi" onClick={() => setNotice(null)}>
            <X size={16} />
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
function PublicHeader() {
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  const { pathname, hash } = useLocation();
  useEffect(() => setOpen(false), [pathname, hash]);
  return (
    <header className="public-header">
      <div className="container header-inner">
        <Brand />
        <button
          className="mobile-menu icon-button"
          aria-label="Buka navigasi"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <Menu />
        </button>
        <nav className={open ? "open" : ""} aria-label="Navigasi utama">
          <NavLink to="/" end>
            Beranda
          </NavLink>
          <NavLink to="/kamar">Katalog kamar</NavLink>
          <Link to="/#tentang">Tentang kami</Link>
          <Link to="/#faq">FAQ</Link>
        </nav>
        <div className="header-actions">
          {user ? (
            <Link
              className="button small"
              to={user.role === "admin" ? "/admin" : "/akun"}
            >
              Dashboard <ArrowUpRight size={15} />
            </Link>
          ) : (
            <>
              <Link className="login-link" to="/login">
                Masuk
              </Link>
              <Link className="button small" to="/register">
                Daftar akun <ArrowUpRight size={15} />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
function Footer() {
  const { config } = useApp();
  return (
    <footer>
      <div className="container footer-grid">
        <div>
          <Brand />
          <p>
            Ruang untuk beristirahat.
            <br />
            Tempat untuk memulai cerita.
          </p>
          <small>
            Contoh bisnis kos · sesuaikan identitas dan lokasi Anda.
          </small>
        </div>
        <div>
          <h4>Jelajahi</h4>
          <Link to="/kamar">Katalog kamar</Link>
          <Link to="/#tentang">Tentang SmartKos</Link>
          <Link to="/#faq">Pertanyaan umum</Link>
        </div>
        <div>
          <h4>Layanan penghuni</h4>
          <Link to="/akun">Pesanan & masa sewa</Link>
          <Link to="/akun/tagihan">Tagihan & pembayaran</Link>
          <Link to="/akun/laporan">Laporan & komplain</Link>
        </div>
        <div>
          <h4>Hubungi pengelola</h4>
          {config?.contact.email && (
            <a href={`mailto:${config.contact.email}`}>
              <Mail size={14} />
              {config.contact.email}
            </a>
          )}
          {config?.contact.phone && (
            <a href={`tel:${config.contact.phone}`}>
              <Phone size={14} />
              {config.contact.phone}
            </a>
          )}
          <Link to="/ketentuan">Ketentuan & privasi</Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} SmartKos. Semua hak dilindungi.
        </span>
        <span>Hunian yang tumbuh bersama Anda.</span>
      </div>
    </footer>
  );
}
function PublicLayout({ children }) {
  return (
    <>
      <PublicHeader />
      <main>{children}</main>
      <Footer />
    </>
  );
}
function RoomCard({ room }) {
  return (
    <article className="room-card">
      <Link to={`/kamar/${room.id}`} className="room-image">
        <img
          src={room.image}
          alt={`Ilustrasi interior ${room.name}`}
          loading="lazy"
        />
        <span className={`availability ${room.available ? "yes" : ""}`}>
          {room.available ? "Tersedia" : "Belum tersedia"}
        </span>
        <span className="image-caption">Ilustrasi kamar</span>
      </Link>
      <div className="room-card-body">
        <div className="room-type">
          {room.type} <span>UNIT {room.number}</span>
        </div>
        <Link to={`/kamar/${room.id}`}>
          <h3>{room.name}</h3>
        </Link>
        <div className="room-meta">
          <span>
            <Square size={13} />
            {room.size} m²
          </span>
          <span>
            <Users size={14} />1 penghuni
          </span>
        </div>
        <p className="room-facilities">
          {room.facilities.slice(0, 3).join(" · ")}
        </p>
        <div className="room-bottom">
          <p>
            <strong>{money(room.price)}</strong>
            <small>/ bulan</small>
          </p>
          <Link
            to={`/kamar/${room.id}`}
            className="circle-link"
            aria-label={`Lihat ${room.name}`}
          >
            <ArrowUpRight size={20} />
          </Link>
        </div>
      </div>
    </article>
  );
}
function useLoad(path, initial) {
  const [data, setData] = useState(initial),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true);
  async function reload() {
    setBusy(true);
    setError("");
    try {
      setData(await api(path));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let live = true;
    setBusy(true);
    setError("");
    api(path)
      .then((v) => live && setData(v))
      .catch((e) => live && setError(e.message))
      .finally(() => live && setBusy(false));
    return () => {
      live = false;
    };
  }, [path]);
  return { data, error, busy, reload };
}
function LoadState({ busy, error, empty, children }) {
  if (busy)
    return (
      <div className="empty">
        <RefreshCw className="spin" size={24} />
        <p>Memuat data…</p>
      </div>
    );
  if (error)
    return (
      <div className="inline-error" role="alert">
        {error}
        <p>
          Pastikan API dan database sudah berjalan, lalu muat ulang halaman.
        </p>
      </div>
    );
  if (empty)
    return (
      <div className="empty">
        <DoorOpen size={32} />
        <h3>Belum ada data</h3>
        <p>Data Anda akan muncul di sini setelah dibuat.</p>
      </div>
    );
  return children;
}
function Home() {
  const { data: rooms, error, busy } = useLoad("/rooms?available=true", []);
  return (
    <PublicLayout>
      <section className="hero container">
        <div className="hero-copy">
          <p className="eyebrow">
            <span /> A BETTER WAY TO LIVE
          </p>
          <h1>
            Bukan sekadar
            <br />
            kamar.
            <br />
            <em>Tempat pulang.</em>
          </h1>
          <p className="hero-description">
            Temukan ruang yang membuat Anda merasa di rumah. Pilih kamar, atur
            masa tinggal, dan nikmati hidup yang lebih sederhana bersama
            SmartKos.
          </p>
          <div className="hero-actions">
            <Link className="button" to="/kamar">
              Temukan kamarmu <ArrowUpRight size={18} />
            </Link>
            <a className="text-button" href="#tentang">
              Kenali SmartKos <ArrowRight size={17} />
            </a>
          </div>
          <div className="hero-assurance">
            <span>
              <Check size={15} />
              Harga transparan
            </span>
            <span>
              <Check size={15} />
              Pemesanan online
            </span>
            <span>
              <Check size={15} />
              Layanan penghuni
            </span>
          </div>
        </div>
        <div className="hero-art">
          <img
            src="/images/hero.svg"
            alt="Ilustrasi kamar SmartKos dengan tempat tidur, ruang kerja, dan tanaman"
          />
          <div className="hero-art-label">
            <span className="mini-icon">
              <Armchair size={21} />
            </span>
            <div>
              <strong>Your everyday sanctuary.</strong>
              <small>Ruang nyaman untuk setiap cerita.</small>
            </div>
          </div>
          <span className="hero-image-note">Ilustrasi konsep interior</span>
          <div className="art-index">01 / YOUR NEXT CHAPTER</div>
        </div>
      </section>
      <div className="value-strip">
        <div className="container">
          <span>
            <Wifi />
            Koneksi untuk produktivitas
          </span>
          <span>
            <ShieldCheck />
            Pengelolaan yang terstruktur
          </span>
          <span>
            <Armchair />
            Pilihan ruang yang nyaman
          </span>
          <span>
            <MessageSquare />
            Laporan langsung ke pengelola
          </span>
        </div>
      </div>
      <section className="section container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FIND YOUR SPACE</p>
            <h2>
              Kamar yang pas.
              <br />
              Untuk ritme hidup Anda.
            </h2>
          </div>
          <div>
            <p>
              Dari yang esensial hingga ruang yang lebih lega.
              <br />
              Temukan pilihan sesuai kebutuhan dan anggaran.
            </p>
            <Link className="text-button" to="/kamar">
              Lihat seluruh kamar <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
        <LoadState busy={busy} error={error} empty={!rooms.length}>
          <div className="room-grid">
            {rooms.slice(0, 3).map((r) => (
              <RoomCard key={r.id} room={r} />
            ))}
          </div>
        </LoadState>
        <p className="subtle-note">
          Katalog awal berisi data contoh. Harga dan fasilitas dapat diatur
          melalui dashboard admin.
        </p>
      </section>
      <section id="tentang" className="about-section">
        <div className="container about-grid">
          <div className="about-visual">
            <img
              src="/images/room-deluxe.svg"
              alt="Ilustrasi ruang tinggal Deluxe"
            />
            <span>DESIGNED FOR EVERYDAY LIVING</span>
          </div>
          <div>
            <p className="eyebrow">TENTANG SMARTKOS</p>
            <h2>
              Hidup mandiri.
              <br />
              <em>Tanpa kerumitan.</em>
            </h2>
            <p>
              Kami percaya hunian yang baik dimulai dari hal sederhana: ruang
              yang nyaman, informasi yang jelas, dan pengelola yang mudah
              dijangkau.
            </p>
            <p>
              SmartKos menghubungkan pencarian kamar dengan kebutuhan
              sehari-hari penghuni. Pesanan, tagihan, perpanjangan, hingga
              laporan fasilitas bisa dikelola melalui akun Anda.
            </p>
            <div className="about-point">
              <CheckCircle2 size={20} />
              <span>
                <strong>Semuanya lebih jelas</strong>
                <small>
                  Ketahui fasilitas, harga, dan status pesanan sebelum
                  memutuskan.
                </small>
              </span>
            </div>
            <div className="about-point">
              <CheckCircle2 size={20} />
              <span>
                <strong>Tetap terhubung</strong>
                <small>
                  Kirim komplain dan pantau tanggapan pengelola dari akun Anda.
                </small>
              </span>
            </div>
          </div>
        </div>
      </section>
      <section className="section container">
        <div className="center-heading">
          <p className="eyebrow">MAKE YOURSELF AT HOME</p>
          <h2>Tiga langkah menuju ruang baru.</h2>
        </div>
        <div className="steps">
          {[
            [
              "01",
              "Temukan yang cocok",
              "Jelajahi tipe kamar, fasilitas, dan harga. Lihat ketersediaan secara langsung.",
            ],
            [
              "02",
              "Pesan & konfirmasi",
              "Buat akun, tentukan tanggal masuk, dan unggah bukti transfer untuk diverifikasi.",
            ],
            [
              "03",
              "Nikmati masa tinggal",
              "Kelola tagihan, perpanjang sewa, dan hubungi pengelola lewat dashboard.",
            ],
          ].map(([n, t, p]) => (
            <div key={n}>
              <span>{n}</span>
              <h3>{t}</h3>
              <p>{p}</p>
            </div>
          ))}
        </div>
      </section>
      <section id="faq" className="faq-section container">
        <div>
          <p className="eyebrow">GOOD TO KNOW</p>
          <h2>
            Sebelum
            <br />
            Anda menetap.
          </h2>
          <p>
            Masih ada pertanyaan?
            <br />
            Hubungi pengelola melalui kontak di bawah.
          </p>
        </div>
        <div className="faq-list">
          {[
            [
              "Bagaimana cara memesan kamar?",
              "Daftar atau masuk, pilih kamar yang tersedia, lalu tentukan tanggal masuk dan durasi 1–12 bulan. Pesanan menahan kamar selama 24 jam untuk pembayaran.",
            ],
            [
              "Bagaimana cara pembayarannya?",
              "Transfer ke rekening yang ditampilkan pada tagihan, lalu unggah bukti JPG/PNG maksimal 5 MB. Sewa aktif setelah admin menyetujui pembayaran. Belum ada debit otomatis atau payment gateway.",
            ],
            [
              "Bisakah saya memperpanjang sewa?",
              "Bisa. Saat masa tinggal sudah dimulai dan masih aktif, buat tagihan perpanjangan di dashboard. Tanggal akhir sewa berubah setelah pembayaran diverifikasi admin.",
            ],
            [
              "Bagaimana jika ada fasilitas yang bermasalah?",
              "Buka menu Laporan, pilih kategori dan tulis detail masalah. Pengelola dapat memperbarui status dan membalas laporan Anda.",
            ],
            [
              "Bagaimana proses checkout dan pembatalan?",
              "Pesanan belum dibayar bisa dibatalkan. Saat sudah tinggal, ajukan checkout dan tunggu konfirmasi admin. Pembatalan yang melibatkan dana dan pengembalian dana ditangani langsung oleh pengelola.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <Plus size={18} />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="cta container">
        <div>
          <p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p>
          <h2>
            Ruang baru.
            <br />
            Cerita baru.
          </h2>
        </div>
        <Link className="button light" to="/kamar">
          Cari kamar sekarang <ArrowUpRight size={19} />
        </Link>
      </section>
    </PublicLayout>
  );
}
function Catalog() {
  const [search, setSearch] = useState(""),
    [type, setType] = useState(""),
    [maxPrice, setMaxPrice] = useState(""),
    [available, setAvailable] = useState(false);
  const params = new URLSearchParams({
    search,
    type,
    ...(maxPrice ? { maxPrice } : {}),
    ...(available ? { available: "true" } : {}),
  });
  const { data, error, busy } = useLoad(`/rooms?${params}`, []);
  return (
    <PublicLayout>
      <section className="catalog-heading container">
        <p className="eyebrow">A SPACE THAT FEELS LIKE YOU</p>
        <h1>Temukan ruang Anda.</h1>
        <p>Pilih kenyamanan yang sesuai dengan kebutuhan dan rencana Anda.</p>
      </section>
      <section className="container catalog-section">
        <form className="filters" onSubmit={(e) => e.preventDefault()}>
          <label className="search-input">
            <Search size={18} />
            <input
              aria-label="Cari nama atau nomor kamar"
              placeholder="Cari nama atau nomor kamar…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            aria-label="Tipe kamar"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">Semua tipe</option>
            {["Standar", "Deluxe", "Suite"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select
            aria-label="Harga maksimum"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          >
            <option value="">Semua harga</option>
            <option value="1000000">Hingga Rp 1 juta</option>
            <option value="1500000">Hingga Rp 1,5 juta</option>
            <option value="2500000">Hingga Rp 2,5 juta</option>
          </select>
          <label className="check-label">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
            />
            Hanya tersedia
          </label>
        </form>
        <div className="results-line">
          <span>{busy ? "Memuat…" : `${data.length} kamar ditemukan`}</span>
          <span>
            <SlidersHorizontal size={14} />
            Urutan harga terendah
          </span>
        </div>
        <LoadState busy={busy} error={error} empty={!data.length}>
          <div className="room-grid">
            {data.map((r) => (
              <RoomCard key={r.id} room={r} />
            ))}
          </div>
        </LoadState>
      </section>
    </PublicLayout>
  );
}
function Auth() {
  const register = useLocation().pathname === "/register";
  const { user, loading, refresh, notice, connectionError } = useApp();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (!loading && user)
    return <Navigate to={user.role === "admin" ? "/admin" : "/akun"} replace />;
  async function submit(e) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError("");
    try {
      await api(register ? "/auth/register" : "/auth/login", {
        method: "POST",
        body,
      });
      const u = await refresh();
      notice({
        message: register
          ? "Akun berhasil dibuat. Selamat datang!"
          : "Selamat datang kembali.",
      });
      navigate(u.role === "admin" ? "/admin" : "/akun");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <PublicLayout>
      <div className="auth-layout container">
        <div className="auth-intro">
          <p className="eyebrow">YOUR EVERYDAY SANCTUARY</p>
          <h1>
            Selangkah lebih
            <br />
            dekat dengan
            <br />
            <em>tempat pulang.</em>
          </h1>
          <img src="/images/room-suite.svg" alt="Ilustrasi ruang SmartKos" />
        </div>
        <div className="auth-card">
          <span className="form-icon">
            <LockKeyhole size={24} />
          </span>
          <h2>{register ? "Mulai cerita Anda." : "Senang bertemu lagi."}</h2>
          <p>
            {register
              ? "Buat akun untuk memesan dan mengelola masa tinggal."
              : "Masuk untuk melanjutkan perjalanan Anda."}
          </p>
          {(error || connectionError) && (
            <div className="inline-error" role="alert">
              {error || connectionError}
            </div>
          )}
          <form onSubmit={submit}>
            {register && (
              <Field
                label="Nama lengkap"
                name="name"
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
              />
            )}
            <Field
              label="Email"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
            {register && (
              <Field
                label="Nomor HP"
                name="phone"
                type="tel"
                pattern="\+?[0-9]{10,15}"
                placeholder="081234567890"
                required
                autoComplete="tel"
              />
            )}
            <Field
              label="Password"
              name="password"
              type="password"
              minLength={register ? 12 : 1}
              maxLength={128}
              required
              autoComplete={register ? "new-password" : "current-password"}
            />
            {register && (
              <>
                <small className="field-hint">
                  Gunakan minimal 12 karakter.
                </small>
                <label className="check-label consent">
                  <input type="checkbox" required />
                  <span>
                    Saya menyetujui{" "}
                    <Link to="/ketentuan">ketentuan dan kebijakan privasi</Link>
                    .
                  </span>
                </label>
              </>
            )}
            <button className="button full" disabled={busy || loading}>
              {busy ? "Memproses…" : register ? "Buat akun" : "Masuk"}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="auth-switch">
            {register ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
            <Link to={register ? "/login" : "/register"}>
              {register ? "Masuk" : "Daftar sekarang"}
            </Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
function Field({ label, ...props }) {
  const uid = React.useId();
  return (
    <label htmlFor={uid} className="field">
      <span>{label}</span>
      <input id={uid} {...props} />
    </label>
  );
}
function SelectField({ label, children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select {...props}>{children}</select>
    </label>
  );
}
function Modal({ title, children, onClose }) {
  const ref = React.useRef(null);
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    const close = () => onClose();
    d.addEventListener("cancel", close);
    return () => {
      d.removeEventListener("cancel", close);
      d.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-header">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Tutup" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function RoomDetail() {
  const roomId = useLocation().pathname.split("/").pop();
  const { data, error, busy } = useLoad("/rooms", []);
  const room = data.find((r) => String(r.id) === roomId);
  const { user, notice } = useApp();
  const navigate = useNavigate();
  const [months, setMonths] = useState(1),
    [saving, setSaving] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (!user) {
      navigate("/login");
      return;
    }
    setSaving(true);
    try {
      await api("/bookings", {
        method: "POST",
        body: {
          roomId: room.id,
          months: Number(months),
          startDate: new FormData(e.currentTarget).get("startDate"),
        },
      });
      notice({
        message: "Kamar berhasil dipesan. Lanjutkan pembayaran dalam 24 jam.",
      });
      navigate("/akun/tagihan");
    } catch (e) {
      notice({ message: e.message, error: true });
    } finally {
      setSaving(false);
    }
  }
  return (
    <PublicLayout>
      <section className="container detail-section">
        <Link to="/kamar" className="text-button">
          ← Kembali ke katalog
        </Link>
        <LoadState
          busy={busy}
          error={error || (!busy && !room ? "Kamar tidak ditemukan." : "")}
        >
          {room && (
            <>
              <div className="detail-title">
                <div>
                  <p className="eyebrow">
                    {room.type} / UNIT {room.number}
                  </p>
                  <h1>{room.name}</h1>
                </div>
                <span
                  className={`availability static ${room.available ? "yes" : ""}`}
                >
                  {room.available ? "Tersedia untuk dipesan" : "Belum tersedia"}
                </span>
              </div>
              <div className="detail-grid">
                <div>
                  <div className="detail-art">
                    <img src={room.image} alt={`Ilustrasi ${room.name}`} />
                    <span>
                      Ilustrasi interior — konfirmasi kondisi aktual dengan
                      pengelola.
                    </span>
                  </div>
                  <div className="detail-copy">
                    <h2>Ruang untuk keseharian Anda.</h2>
                    <p>{room.description}</p>
                    <div className="room-meta">
                      <span>
                        <Square size={16} />
                        {room.size} m²
                      </span>
                      <span>
                        <Users size={16} />
                        Kapasitas 1 orang
                      </span>
                    </div>
                    <h3>Fasilitas kamar</h3>
                    <div className="facility-grid">
                      {room.facilities.map((f) => (
                        <span key={f}>
                          <CheckCircle2 size={17} />
                          {f}
                        </span>
                      ))}
                    </div>
                    <h3>Hal yang perlu diketahui</h3>
                    <ul className="rules">
                      <li>
                        Harga per bulan, tanpa biaya tersembunyi di sistem.
                      </li>
                      <li>
                        Sewa dihitung per bulan kalender, tanggal akhir tidak
                        termasuk.
                      </li>
                      <li>
                        Kamar ditahan 24 jam setelah pemesanan; pembayaran
                        diverifikasi manual.
                      </li>
                      <li>
                        Konfirmasi biaya listrik, air, deposit, dan aturan
                        properti dengan pengelola sebelum transfer.
                      </li>
                    </ul>
                  </div>
                </div>
                <aside className="booking-panel">
                  <p className="eyebrow">MAKE IT YOURS</p>
                  <p className="booking-price">
                    {money(room.price)}
                    <small>/ bulan</small>
                  </p>
                  <form onSubmit={submit}>
                    <Field
                      label="Tanggal mulai tinggal"
                      name="startDate"
                      type="date"
                      min={currentDate()}
                      defaultValue={currentDate()}
                      required
                    />
                    <SelectField
                      label="Durasi sewa"
                      value={months}
                      onChange={(e) => setMonths(e.target.value)}
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1} bulan
                        </option>
                      ))}
                    </SelectField>
                    <div className="booking-total">
                      <span>Total tagihan</span>
                      <strong>{money(room.price * months)}</strong>
                    </div>
                    <button
                      className="button full"
                      disabled={
                        !room.available || saving || user?.role === "admin"
                      }
                    >
                      {saving
                        ? "Memesan…"
                        : !room.available
                          ? "Belum tersedia"
                          : user?.role === "admin"
                            ? "Gunakan akun penghuni"
                            : user
                              ? "Pesan kamar ini"
                              : "Masuk untuk memesan"}
                      <ArrowUpRight size={17} />
                    </button>
                    <p className="field-hint">
                      <ShieldCheck size={14} />
                      Pesanan aktif setelah pembayaran diverifikasi.
                    </p>
                  </form>
                </aside>
              </div>
            </>
          )}
        </LoadState>
      </section>
    </PublicLayout>
  );
}
function Guard({ admin = false, children }) {
  const { user, loading, connectionError } = useApp();
  if (loading) return <div className="empty">Memeriksa sesi…</div>;
  if (connectionError)
    return (
      <PublicLayout>
        <div className="container section inline-error">{connectionError}</div>
      </PublicLayout>
    );
  if (!user) return <Navigate to="/login" replace />;
  if ((user.role === "admin") !== admin)
    return <Navigate to={user.role === "admin" ? "/admin" : "/akun"} replace />;
  return children;
}
function DashboardLayout({ admin = false, children }) {
  const { user, refresh, notice } = useApp();
  const navigate = useNavigate();
  const base = admin ? "/admin" : "/akun";
  const menu = admin
    ? [
        [base, "Ringkasan", LayoutDashboard],
        [base + "/kamar", "Kamar", DoorOpen],
        [base + "/pesanan", "Pesanan & pembayaran", FileText],
        [base + "/penghuni", "Penghuni", Users],
        [base + "/keuangan", "Keuangan", Wallet],
        [base + "/laporan", "Laporan penghuni", MessageSquare],
        [base + "/profil", "Profil admin", Settings],
      ]
    : [
        [base, "Masa tinggal", LayoutDashboard],
        [base + "/tagihan", "Tagihan & pembayaran", Wallet],
        [base + "/laporan", "Laporan & komplain", MessageSquare],
        [base + "/profil", "Profil saya", Settings],
      ];
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
      await refresh();
      navigate("/");
    } catch (e) {
      notice({ message: e.message, error: true });
    }
  }
  return (
    <div className="dashboard-layout">
      <aside className="dash-sidebar">
        <Brand />
        <p className="eyebrow">
          {admin ? "MANAGEMENT WORKSPACE" : "YOUR LIVING SPACE"}
        </p>
        <nav aria-label="Menu dashboard">
          {menu.map(([p, t, Icon]) => (
            <NavLink end={p === base} key={p} to={p}>
              <Icon size={18} />
              {t}
            </NavLink>
          ))}
        </nav>
        <Link className="back-to-site" to="/kamar">
          Jelajahi kamar <ArrowUpRight size={16} />
        </Link>
        <div className="dash-user">
          <span className="avatar">{user.name[0].toUpperCase()}</span>
          <div>
            <strong>{user.name}</strong>
            <small>{admin ? "Administrator" : "Penghuni SmartKos"}</small>
          </div>
          <button
            onClick={logout}
            className="icon-button"
            aria-label="Keluar akun"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="dash-workspace">
        <header className="dash-topbar">
          <span>
            <span className="status-dot" />{" "}
            {admin ? "Admin portal" : "Resident portal"}
          </span>
          <span>
            <CalendarDays size={15} />
            {date(currentDate())}
          </span>
        </header>
        <main className="dash-main">{children}</main>
      </div>
    </div>
  );
}
function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow || "SMARTKOS WORKSPACE"}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
function TenantHome() {
  const { data, error, busy, reload } = useLoad("/bookings", []);
  const { user, notice } = useApp();
  const [action, setAction] = useState(null),
    [saving, setSaving] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/bookings/${action.id}/action`, {
        method: "POST",
        body: {
          action: action.type,
          months: Number(new FormData(e.currentTarget).get("months") || 1),
        },
      });
      notice({
        message:
          action.type === "renew"
            ? "Tagihan perpanjangan dibuat. Silakan lakukan pembayaran."
            : "Permintaan berhasil disimpan.",
      });
      setAction(null);
      await reload();
    } catch (e) {
      notice({ message: e.message, error: true });
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <PageHeading
        title={`Halo, ${user.name.split(" ")[0]}.`}
        description="Semua tentang masa tinggal Anda, dalam satu tempat."
        action={
          <Link className="button" to="/kamar">
            Cari kamar <ArrowUpRight size={17} />
          </Link>
        }
      />
      <div className="notice-box">
        <ShieldCheck size={21} />
        <p>
          Pesanan menahan kamar selama 24 jam. Sewa aktif setelah pembayaran
          diverifikasi. Untuk dana yang sudah ditransfer atau pengembalian dana,
          hubungi pengelola.
        </p>
      </div>
      <LoadState busy={busy} error={error} empty={!data.length}>
        {data.map((b) => (
          <article className="stay-card" key={b.id}>
            <img src={b.image} alt={`Ilustrasi ${b.room_name}`} />
            <div className="stay-content">
              <div className="row-between">
                <span className="eyebrow">{b.code}</span>
                <Badge status={b.status} />
              </div>
              <h2>
                {b.room_name} <small>Unit {b.room_number}</small>
              </h2>
              <div className="stay-dates">
                <span>
                  <small>Mulai tinggal</small>
                  {date(b.start_date)}
                </span>
                <ArrowRight size={17} />
                <span>
                  <small>Akhir sewa</small>
                  {date(b.end_date)}
                </span>
                <span>
                  <small>Harga / bulan</small>
                  {money(b.monthly_price)}
                </span>
              </div>
              {b.status === "pending" && (
                <p className="field-hint">
                  Batas pembayaran:{" "}
                  {new Date(
                    b.expires_at.replace(" ", "T") + "Z",
                  ).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}{" "}
                  WIB. Bukti yang dikirim akan menahan kamar selama peninjauan.
                </p>
              )}
              {b.status === "active" && b.end_date < currentDate() && (
                <p className="inline-error">
                  Masa sewa berakhir. Hubungi admin untuk penyelesaian checkout.
                </p>
              )}
              <div className="actions">
                {b.status === "pending" && (
                  <>
                    <Link className="button small" to="/akun/tagihan">
                      Lihat tagihan
                    </Link>
                    <button
                      className="button outline small"
                      onClick={() => setAction({ id: b.id, type: "cancel" })}
                      disabled={b.invoices.some(
                        (i) => i.status === "submitted",
                      )}
                    >
                      Batalkan pesanan
                    </button>
                  </>
                )}
                {b.status === "active" && b.start_date <= currentDate() && (
                  <>
                    <button
                      className="button small"
                      onClick={() => setAction({ id: b.id, type: "renew" })}
                      disabled={b.end_date < currentDate()}
                    >
                      Perpanjang sewa
                    </button>
                    <button
                      className="button outline small"
                      onClick={() => setAction({ id: b.id, type: "checkout" })}
                    >
                      Ajukan checkout
                    </button>
                    <Link className="text-button" to="/akun/laporan">
                      Buat laporan <ArrowRight size={15} />
                    </Link>
                  </>
                )}
              </div>
            </div>
          </article>
        ))}
      </LoadState>
      {action && (
        <Modal
          title={
            action.type === "renew"
              ? "Perpanjang masa tinggal"
              : action.type === "checkout"
                ? "Ajukan checkout"
                : "Batalkan pesanan"
          }
          onClose={() => setAction(null)}
        >
          <form onSubmit={submit}>
            {action.type === "renew" ? (
              <>
                <p>
                  Tagihan dibuat berdasarkan harga bulanan saat pemesanan.
                  Periode sewa bertambah setelah admin menyetujui pembayaran.
                </p>
                <SelectField label="Tambahan masa sewa" name="months">
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} bulan
                    </option>
                  ))}
                </SelectField>
              </>
            ) : (
              <p>
                {action.type === "checkout"
                  ? "Admin akan memeriksa kondisi kamar dan mengonfirmasi checkout. Sisa tagihan perpanjangan yang belum dibayar akan dibatalkan. Pengembalian dana ditangani langsung dengan pengelola."
                  : "Kamar akan kembali tersedia. Gunakan pembatalan hanya jika belum mentransfer dana. Jika sudah transfer, hubungi pengelola terlebih dahulu."}
              </p>
            )}
            <div className="actions">
              <button className="button" disabled={saving}>
                {saving ? "Memproses…" : "Konfirmasi"}
              </button>
              <button
                type="button"
                className="button outline"
                onClick={() => setAction(null)}
              >
                Kembali
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
function TenantInvoices() {
  const { data, error, busy, reload } = useLoad("/bookings", []);
  const { config, notice } = useApp();
  const [upload, setUpload] = useState(null),
    [saving, setSaving] = useState(false);
  const bank = config?.bank;
  const bankReady = bank?.account && bank?.name && bank?.holder;
  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/invoices/${upload.id}/proof`, {
        method: "POST",
        body: new FormData(e.currentTarget),
      });
      notice({ message: "Bukti terkirim. Tunggu verifikasi admin." });
      setUpload(null);
      await reload();
    } catch (e) {
      notice({ message: e.message, error: true });
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <PageHeading
        title="Tagihan & pembayaran"
        description="Riwayat pembayaran dan tagihan masa tinggal Anda."
      />
      <div className="bank-card">
        <Wallet size={25} />
        <div>
          <small>TRANSFER BANK</small>
          <h3>
            {bankReady
              ? `${bank.name} · ${bank.account}`
              : "Rekening belum dikonfigurasi"}
          </h3>
          <p>
            {bankReady
              ? `Atas nama ${bank.holder}. Transfer sesuai nominal, lalu unggah bukti.`
              : "Hubungi pengelola. Jangan transfer sebelum rekening resmi ditampilkan."}
          </p>
        </div>
      </div>
      <LoadState
        busy={busy}
        error={error}
        empty={!data.some((b) => b.invoices.length)}
      >
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pesanan / tagihan</th>
                <th>Periode</th>
                <th>Jumlah</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.flatMap((b) =>
                b.invoices.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <strong>{b.code}</strong>
                      <small>
                        {i.kind === "booking"
                          ? "Pemesanan awal"
                          : "Perpanjangan"}{" "}
                        · INV-{i.id}
                      </small>
                      {i.review_note && (
                        <small className="review-note">
                          Catatan admin: {i.review_note}
                        </small>
                      )}
                    </td>
                    <td>
                      {date(i.period_start)}
                      <small>s.d. {date(i.period_end)}</small>
                    </td>
                    <td className="nowrap">{money(i.amount)}</td>
                    <td>
                      <Badge status={i.status} />
                    </td>
                    <td>
                      {i.status === "unpaid" &&
                        ["pending", "active"].includes(b.status) && (
                          <button
                            className="button small"
                            disabled={!bankReady}
                            onClick={() => setUpload(i)}
                          >
                            <Upload size={15} />
                            Unggah bukti
                          </button>
                        )}
                      {!!i.has_proof && (
                        <a
                          className="text-button"
                          target="_blank"
                          rel="noreferrer"
                          href={`/api/invoices/${i.id}/proof`}
                        >
                          Lihat bukti <ArrowUpRight size={14} />
                        </a>
                      )}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </LoadState>
      {upload && (
        <Modal
          title={`Bukti pembayaran INV-${upload.id}`}
          onClose={() => setUpload(null)}
        >
          <form onSubmit={submit}>
            <p>
              Total transfer <strong>{money(upload.amount)}</strong>. Pastikan
              jumlah dan rekening sudah benar.
            </p>
            <Field
              label="Bukti transfer (JPG/PNG, maksimal 5 MB)"
              name="proof"
              type="file"
              accept="image/jpeg,image/png"
              required
            />
            <button className="button full" disabled={saving}>
              {saving ? "Mengunggah…" : "Kirim bukti pembayaran"}
              <Upload size={17} />
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
function Complaints({ admin = false }) {
  const { data, error, busy, reload } = useLoad("/complaints", []);
  const bookings = useLoad("/bookings", []);
  const { notice } = useApp();
  const [modal, setModal] = useState(null),
    [saving, setSaving] = useState(false);
  const eligible = bookings.data.filter(
    (b) =>
      ["active", "checkout_requested"].includes(b.status) &&
      b.start_date <= currentDate(),
  );
  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = Object.fromEntries(new FormData(e.currentTarget));
      await api(admin ? `/admin/complaints/${modal.id}` : "/complaints", {
        method: admin ? "PATCH" : "POST",
        body,
      });
      notice({
        message: admin
          ? "Tanggapan berhasil diperbarui."
          : "Laporan terkirim ke pengelola.",
      });
      setModal(null);
      await reload();
    } catch (e) {
      notice({ message: e.message, error: true });
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <PageHeading
        title={admin ? "Laporan penghuni" : "Laporan & komplain"}
        description={
          admin
            ? "Tindak lanjuti kebutuhan dan kendala penghuni."
            : "Sampaikan kendala fasilitas dan pantau perkembangannya."
        }
        action={
          !admin && (
            <button
              className="button"
              disabled={!eligible.length}
              onClick={() => setModal({})}
            >
              <Plus size={17} />
              Buat laporan
            </button>
          )
        }
      />
      {!admin && !eligible.length && (
        <p className="notice-box">
          Laporan dapat dibuat setelah masa tinggal Anda dimulai dan pembayaran
          disetujui.
        </p>
      )}
      <LoadState busy={busy} error={error} empty={!data.length}>
        <div className="complaint-grid">
          {data.map((c) => (
            <article className="panel complaint-card" key={c.id}>
              <div className="row-between">
                <span className="eyebrow">
                  UNIT {c.room_number} · {c.category}
                </span>
                <Badge status={c.status} />
              </div>
              <h3>{c.title}</h3>
              <p className="preserve-lines">{c.description}</p>
              <small>
                {admin ? `${c.tenant_name} · ` : ""}
                {date(c.created_at)}
              </small>
              {c.reply && (
                <div className="complaint-reply">
                  <strong>Tanggapan pengelola</strong>
                  <p className="preserve-lines">{c.reply}</p>
                </div>
              )}
              {admin && (
                <button
                  className="button outline small"
                  onClick={() => setModal(c)}
                >
                  <MessageSquare size={15} />
                  Tanggapi laporan
                </button>
              )}
            </article>
          ))}
        </div>
      </LoadState>
      {modal && (
        <Modal
          title={admin ? "Tanggapi laporan" : "Buat laporan baru"}
          onClose={() => setModal(null)}
        >
          <form onSubmit={submit}>
            {admin ? (
              <>
                <p>{modal.title}</p>
                <SelectField
                  label="Status laporan"
                  name="status"
                  defaultValue={modal.status}
                >
                  {["open", "in_progress", "resolved"].map((s) => (
                    <option key={s} value={s}>
                      {labels[s]}
                    </option>
                  ))}
                </SelectField>
                <label className="field">
                  <span>Tanggapan pengelola</span>
                  <textarea
                    name="reply"
                    rows={4}
                    required
                    maxLength={3000}
                    defaultValue={modal.reply || ""}
                  />
                </label>
              </>
            ) : (
              <>
                <SelectField label="Kamar Anda" name="bookingId" required>
                  {eligible.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.room_name} · {b.code}
                    </option>
                  ))}
                </SelectField>
                <SelectField label="Kategori" name="category">
                  {[
                    "Listrik & Air",
                    "Fasilitas",
                    "Kebersihan",
                    "Keamanan",
                    "Lainnya",
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </SelectField>
                <Field
                  label="Judul laporan"
                  name="title"
                  required
                  minLength={3}
                  maxLength={120}
                />
                <label className="field">
                  <span>Detail kendala</span>
                  <textarea
                    name="description"
                    rows={4}
                    required
                    minLength={10}
                    maxLength={3000}
                  />
                </label>
              </>
            )}
            <button className="button full" disabled={saving}>
              {saving ? "Menyimpan…" : "Kirim"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
function Profile() {
  const { user, refresh, notice } = useApp();
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  async function save(e, password = false) {
    e.preventDefault();
    const form = e.currentTarget;
    setSaving(true);
    try {
      await api(password ? "/profile/password" : "/profile", {
        method: password ? "POST" : "PATCH",
        body: Object.fromEntries(new FormData(form)),
      });
      if (password) {
        await refresh();
        navigate("/login");
        notice({ message: "Password diubah. Silakan masuk kembali." });
      } else {
        await refresh();
        notice({ message: "Profil diperbarui." });
      }
    } catch (e) {
      notice({ message: e.message, error: true });
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <PageHeading
        title="Profil saya"
        description="Perbarui kontak dan jaga keamanan akun Anda."
      />
      <div className="two-columns">
        <form className="panel form-panel" onSubmit={(e) => save(e)}>
          <h2>Informasi pribadi</h2>
          <Field
            label="Nama lengkap"
            name="name"
            required
            minLength={2}
            maxLength={100}
            defaultValue={user.name}
          />
          <Field label="Email" type="email" value={user.email} readOnly />
          <Field
            label="Nomor HP"
            name="phone"
            required
            type="tel"
            pattern="\+?[0-9]{10,15}"
            defaultValue={user.phone}
          />
          <button className="button" disabled={saving}>
            Simpan profil
          </button>
        </form>
        <form className="panel form-panel" onSubmit={(e) => save(e, true)}>
          <h2>Ubah password</h2>
          <Field
            label="Password saat ini"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
          />
          <Field
            label="Password baru (minimal 12 karakter)"
            name="newPassword"
            type="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
          />
          <p className="field-hint">
            Semua sesi akan diakhiri setelah password diubah.
          </p>
          <button className="button outline" disabled={saving}>
            Ubah password
          </button>
        </form>
      </div>
    </>
  );
}
function AdminHome() {
  const bookings = useLoad("/bookings", []),
    rooms = useLoad("/admin/rooms", []),
    finance = useLoad("/admin/finance", null),
    complaints = useLoad("/complaints", []);
  const occupied = new Set(
    bookings.data
      .filter((b) =>
        ["active", "pending", "checkout_requested"].includes(b.status),
      )
      .map((b) => b.room_id),
  ).size;
  const submitted = bookings.data
    .flatMap((b) => b.invoices)
    .filter((i) => i.status === "submitted").length;
  return (
    <>
      <PageHeading
        title="Bisnis Anda, dalam kendali."
        description="Pantau hunian, pembayaran, dan layanan penghuni."
      />
      <LoadState
        busy={bookings.busy || rooms.busy || finance.busy || complaints.busy}
        error={
          bookings.error || rooms.error || finance.error || complaints.error
        }
      >
        <div className="stats-grid">
          <Stat
            label="Kamar terpesan / aktif"
            value={`${occupied} / ${rooms.data.length}`}
            icon={DoorOpen}
          />
          <Stat label="Menunggu verifikasi" value={submitted} icon={Wallet} />
          <Stat
            label="Laporan terbuka"
            value={
              complaints.data.filter((c) => c.status !== "resolved").length
            }
            icon={MessageSquare}
          />
          <Stat
            label="Saldo bersih"
            value={money(finance.data?.balance || 0)}
            icon={LayoutDashboard}
            color="green"
          />
        </div>
        <div className="two-columns">
          <section className="panel form-panel">
            <h2>Prioritas hari ini</h2>
            <Link className="action-row" to="/admin/pesanan">
              <span>
                <Wallet size={20} />
                Verifikasi pembayaran
              </span>
              <strong>
                {submitted} <ArrowUpRight size={17} />
              </strong>
            </Link>
            <Link className="action-row" to="/admin/laporan">
              <span>
                <MessageSquare size={20} />
                Laporan penghuni
              </span>
              <ArrowUpRight size={17} />
            </Link>
            <Link className="action-row" to="/admin/pesanan">
              <span>
                <DoorOpen size={20} />
                Permintaan checkout
              </span>
              <strong>
                {
                  bookings.data.filter((b) => b.status === "checkout_requested")
                    .length
                }{" "}
                <ArrowUpRight size={17} />
              </strong>
            </Link>
          </section>
          <section className="panel form-panel">
            <h2>Alur operasional</h2>
            <ol className="rules">
              <li>Periksa bukti transfer dengan mutasi rekening bank.</li>
              <li>Setujui pembayaran yang valid untuk mengaktifkan sewa.</li>
              <li>Tanggapi laporan dan periksa kondisi kamar saat checkout.</li>
              <li>
                Konfirmasi checkout untuk membuka kembali ketersediaan kamar.
              </li>
            </ol>
            <p className="field-hint">
              Tanggal akhir sewa tidak otomatis mengosongkan kamar: admin harus
              menyelesaikan checkout.
            </p>
          </section>
        </div>
      </LoadState>
    </>
  );
}
function Stat({ label, value, icon: Icon, color = "" }) {
  return (
    <article className={`stat-card ${color}`}>
      <div>
        <span>{label}</span>
        <Icon size={19} />
      </div>
      <strong>{value}</strong>
    </article>
  );
}
function AdminRooms() {
  const { data, error, busy, reload } = useLoad("/admin/rooms", []);
  const { notice } = useApp();
  const [modal, setModal] = useState(null),
    [saving, setSaving] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const v = Object.fromEntries(new FormData(e.currentTarget));
      v.facilities = v.facilities
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await api(modal.id ? `/admin/rooms/${modal.id}` : "/admin/rooms", {
        method: modal.id ? "PATCH" : "POST",
        body: v,
      });
      setModal(null);
      notice({ message: "Data kamar berhasil disimpan." });
      await reload();
    } catch (e) {
      notice({ message: e.message, error: true });
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <PageHeading
        title="Manajemen kamar"
        description="Atur penawaran, fasilitas, dan harga kamar di katalog."
        action={
          <button className="button" onClick={() => setModal({})}>
            <Plus size={17} />
            Tambah kamar
          </button>
        }
      />
      <LoadState busy={busy} error={error} empty={!data.length}>
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Kamar</th>
                <th>Tipe / luas</th>
                <th>Harga / bulan</th>
                <th>Penawaran</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.name}</strong>
                    <small>Unit {r.number}</small>
                  </td>
                  <td>
                    {r.type}
                    <small>{r.size} m²</small>
                  </td>
                  <td>{money(r.price)}</td>
                  <td>
                    <Badge status={r.status} />
                  </td>
                  <td>
                    <button
                      className="button outline small"
                      onClick={() => setModal(r)}
                    >
                      Edit kamar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LoadState>
      {modal && (
        <Modal
          title={modal.id ? "Edit kamar" : "Tambah kamar"}
          onClose={() => setModal(null)}
        >
          <form onSubmit={submit}>
            <Field
              label="Nama kamar"
              name="name"
              required
              minLength={3}
              maxLength={120}
              defaultValue={modal.name || ""}
            />
            <div className="two-columns">
              <Field
                label="Nomor unit"
                name="number"
                required
                maxLength={20}
                defaultValue={modal.number || ""}
              />
              <SelectField
                label="Tipe"
                name="type"
                defaultValue={modal.type || "Standar"}
              >
                {["Standar", "Deluxe", "Suite"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </SelectField>
            </div>
            <div className="two-columns">
              <Field
                label="Harga bulanan (Rp)"
                name="price"
                type="number"
                min={10000}
                max={100000000}
                required
                defaultValue={modal.price || ""}
              />
              <Field
                label="Luas (m²)"
                name="size"
                type="number"
                min={6}
                max={200}
                required
                defaultValue={modal.size || 12}
              />
            </div>
            <label className="field">
              <span>Deskripsi</span>
              <textarea
                name="description"
                minLength={10}
                maxLength={3000}
                rows={3}
                required
                defaultValue={modal.description || ""}
              />
            </label>
            <Field
              label="Fasilitas (pisahkan dengan koma)"
              name="facilities"
              required
              defaultValue={
                modal.facilities?.join(", ") || "WiFi, Kamar mandi dalam"
              }
            />
            <SelectField
              label="Ilustrasi katalog"
              name="image"
              defaultValue={modal.image || "/images/room-standard.svg"}
            >
              {["standard", "deluxe", "suite"].map((s) => (
                <option key={s} value={`/images/room-${s}.svg`}>
                  {s}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Status penawaran"
              name="status"
              defaultValue={modal.status || "available"}
            >
              {["available", "maintenance", "hidden"].map((s) => (
                <option key={s} value={s}>
                  {labels[s]}
                </option>
              ))}
            </SelectField>
            <p className="field-hint">
              Status penawaran terpisah dari keterisian. Pesanan aktif tetap
              memblokir kamar. Perubahan harga hanya untuk pesanan baru.
            </p>
            <button className="button full" disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan kamar"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
function AdminBookings() {
  const { data, error, busy, reload } = useLoad("/bookings", []);
  const { notice } = useApp();
  const [filter, setFilter] = useState("all"),
    [modal, setModal] = useState(null),
    [saving, setSaving] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const note = new FormData(e.currentTarget).get("note") || "";
      await api(
        modal.invoice
          ? `/admin/invoices/${modal.invoice.id}/review`
          : `/bookings/${modal.booking.id}/action`,
        {
          method: "POST",
          body: modal.invoice
            ? { approved: modal.approved, note }
            : { action: "complete" },
        },
      );
      notice({
        message: modal.invoice
          ? "Verifikasi berhasil disimpan."
          : "Checkout dikonfirmasi. Kamar kembali tersedia.",
      });
      setModal(null);
      await reload();
    } catch (e) {
      notice({ message: e.message, error: true });
    } finally {
      setSaving(false);
    }
  }
  const filtered = data.filter(
    (b) =>
      filter === "all" ||
      (filter === "submitted"
        ? b.invoices.some((i) => i.status === "submitted")
        : b.status === filter),
  );
  return (
    <>
      <PageHeading
        title="Pesanan & pembayaran"
        description="Verifikasi transfer, pantau masa tinggal, dan konfirmasi checkout."
      />
      <div className="tabs">
        {[
          ["all", "Semua"],
          ["submitted", "Perlu verifikasi"],
          ["active", "Sewa aktif"],
          ["checkout_requested", "Checkout"],
        ].map(([v, t]) => (
          <button
            key={v}
            className={filter === v ? "selected" : ""}
            onClick={() => setFilter(v)}
          >
            {t}
          </button>
        ))}
      </div>
      <LoadState busy={busy} error={error} empty={!filtered.length}>
        {filtered.map((b) => (
          <article key={b.id} className="panel admin-booking">
            <div className="row-between">
              <div>
                <p className="eyebrow">
                  {b.code} · UNIT {b.room_number}
                </p>
                <h2>{b.tenant_name}</h2>
                <p>
                  {b.tenant_email} · {b.tenant_phone}
                </p>
              </div>
              <Badge status={b.status} />
            </div>
            <div className="booking-info">
              <span>{b.room_name}</span>
              <span>
                {date(b.start_date)} — {date(b.end_date)}
              </span>
              <span>{money(b.monthly_price)} / bulan</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tagihan</th>
                    <th>Jumlah</th>
                    <th>Status</th>
                    <th>Verifikasi</th>
                  </tr>
                </thead>
                <tbody>
                  {b.invoices.map((i) => (
                    <tr key={i.id}>
                      <td>
                        INV-{i.id}
                        <small>
                          {i.kind === "booking" ? "Sewa awal" : "Perpanjangan"}{" "}
                          · {i.months} bulan
                        </small>
                      </td>
                      <td>{money(i.amount)}</td>
                      <td>
                        <Badge status={i.status} />
                        {i.review_note && <small>{i.review_note}</small>}
                      </td>
                      <td>
                        {!!i.has_proof && (
                          <a
                            className="text-button"
                            href={`/api/invoices/${i.id}/proof`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Lihat bukti <ArrowUpRight size={14} />
                          </a>
                        )}
                        {i.status === "submitted" && (
                          <div className="actions">
                            <button
                              className="button small"
                              onClick={() =>
                                setModal({ invoice: i, approved: true })
                              }
                            >
                              Setujui
                            </button>
                            <button
                              className="button danger small"
                              onClick={() =>
                                setModal({ invoice: i, approved: false })
                              }
                            >
                              Tolak
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(b.status === "checkout_requested" ||
              (b.status === "active" && b.end_date <= currentDate())) && (
              <button
                className="button outline small"
                onClick={() => setModal({ booking: b })}
              >
                <CheckCircle2 size={16} />
                Konfirmasi checkout
              </button>
            )}
          </article>
        ))}
      </LoadState>
      {modal && (
        <Modal
          title={
            modal.invoice
              ? modal.approved
                ? "Setujui pembayaran"
                : "Tolak pembayaran"
              : "Konfirmasi checkout"
          }
          onClose={() => setModal(null)}
        >
          <form onSubmit={submit}>
            <p>
              {modal.invoice
                ? `Pastikan mutasi bank sudah diperiksa. ${money(modal.invoice.amount)} akan ${modal.approved ? "dicatat sebagai pemasukan" : "dikembalikan ke status belum dibayar"}.`
                : "Pastikan penghuni sudah meninggalkan kamar dan kewajiban selesai. Kamar akan dibuka kembali untuk pemesanan."}
            </p>
            {modal.invoice && (
              <label className="field">
                <span>
                  Catatan {modal.approved ? "(opsional)" : "penolakan (wajib)"}
                </span>
                <textarea
                  name="note"
                  rows={3}
                  required={!modal.approved}
                  maxLength={500}
                />
              </label>
            )}
            <button className="button full" disabled={saving}>
              {saving ? "Memproses…" : "Konfirmasi"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
function AdminFinance() {
  const { data, error, busy, reload } = useLoad("/admin/finance", null);
  const { notice } = useApp();
  const [modal, setModal] = useState(false),
    [saving, setSaving] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/admin/expenses", {
        method: "POST",
        body: Object.fromEntries(new FormData(e.currentTarget)),
      });
      setModal(false);
      notice({ message: "Pengeluaran dicatat." });
      await reload();
    } catch (e) {
      notice({ message: e.message, error: true });
    } finally {
      setSaving(false);
    }
  }
  function exportCsv() {
    const records = [
      ["Tanggal", "Keterangan", "Tipe", "Jumlah"],
      ...data.payments.map((p) => [
        p.paid_at,
        `Sewa ${p.code} ${p.name}`,
        "Pemasukan",
        p.amount,
      ]),
      ...data.expenses.map((e) => [
        e.expense_date,
        e.description,
        "Pengeluaran",
        e.amount,
      ]),
    ];
    const csv =
      "\uFEFF" +
      records
        .map((r) =>
          r
            .map(
              (v) =>
                '"' +
                String(v)
                  .replace(/^[\s=+@\-]/, "'$&")
                  .replaceAll('"', '""') +
                '"',
            )
            .join(","),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "laporan-keuangan-smartkos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <PageHeading
        title="Keuangan"
        description="Pemasukan terverifikasi dan biaya operasional dalam rupiah."
        action={
          <div className="actions">
            <button
              className="button outline"
              disabled={!data}
              onClick={exportCsv}
            >
              <FileText size={16} />
              Ekspor CSV
            </button>
            <button className="button" onClick={() => setModal(true)}>
              <Plus size={17} />
              Pengeluaran
            </button>
          </div>
        }
      />
      <LoadState busy={busy} error={error}>
        {data && (
          <>
            <div className="stats-grid three">
              <Stat
                label="Total pemasukan"
                value={money(data.income)}
                icon={Wallet}
                color="blue"
              />
              <Stat
                label="Total pengeluaran"
                value={money(data.expense)}
                icon={Wallet}
                color="red"
              />
              <Stat
                label="Saldo bersih"
                value={money(data.balance)}
                icon={Wallet}
                color="green"
              />
            </div>
            <div className="two-columns">
              <section className="panel">
                <h2 className="panel-title">Pemasukan terverifikasi</h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Transaksi</th>
                        <th>Jumlah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.payments.map((p) => (
                        <tr key={p.id}>
                          <td>
                            {p.code}
                            <small>
                              {p.name} · {date(p.paid_at)}
                            </small>
                          </td>
                          <td className="income-text">{money(p.amount)}</td>
                        </tr>
                      ))}
                      {!data.payments.length && (
                        <tr>
                          <td colSpan={2}>Belum ada pembayaran disetujui.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="panel">
                <h2 className="panel-title">Pengeluaran operasional</h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Keterangan</th>
                        <th>Jumlah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.expenses.map((e) => (
                        <tr key={e.id}>
                          <td>
                            {e.description}
                            <small>{date(e.expense_date)}</small>
                          </td>
                          <td className="expense-text">{money(e.amount)}</td>
                        </tr>
                      ))}
                      {!data.expenses.length && (
                        <tr>
                          <td colSpan={2}>Belum ada pengeluaran.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </>
        )}
      </LoadState>
      {modal && (
        <Modal title="Catat pengeluaran" onClose={() => setModal(false)}>
          <form onSubmit={submit}>
            <Field
              label="Keterangan"
              name="description"
              required
              minLength={3}
              maxLength={200}
            />
            <Field
              label="Jumlah (Rp)"
              name="amount"
              type="number"
              min={1}
              max={1000000000}
              required
            />
            <Field
              label="Tanggal"
              name="date"
              type="date"
              required
              defaultValue={currentDate()}
            />
            <button className="button full" disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan pengeluaran"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
function AdminTenants() {
  const { data, error, busy } = useLoad("/admin/tenants", []);
  return (
    <>
      <PageHeading
        title="Data penghuni"
        description="Daftar akun penghuni yang terdaftar di SmartKos."
      />
      <LoadState busy={busy} error={error} empty={!data.length}>
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Nomor HP</th>
                <th>Terdaftar</th>
              </tr>
            </thead>
            <tbody>
              {data.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.phone}</td>
                  <td>{date(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LoadState>
    </>
  );
}
function Terms() {
  return (
    <PublicLayout>
      <article className="container terms section">
        <p className="eyebrow">TRANSPARANSI LAYANAN</p>
        <h1>Ketentuan & privasi</h1>
        <p className="notice-box">
          Dokumen awal untuk proyek contoh. Pengelola wajib menyesuaikan
          identitas bisnis, aturan properti, rincian biaya, dan kebijakan
          pengembalian dana sebelum menerima pelanggan nyata.
        </p>
        <h2>Pemesanan dan masa sewa</h2>
        <p>
          Satu akun penghuni dapat memiliki satu pesanan berjalan. Tanggal masuk
          dapat dipilih hingga tiga bulan ke depan. Durasi 1–12 bulan kalender.
          Pesanan belum dibayar ditahan 24 jam. Kamar tetap diblokir selama
          peninjauan bukti transfer dan selama penghuni belum menyelesaikan
          checkout.
        </p>
        <h2>Pembayaran dan perpanjangan</h2>
        <p>
          Pembayaran melalui transfer manual ke rekening yang ditampilkan pada
          tagihan. Unggah bukti asli; admin mencocokkan dengan mutasi bank
          sebelum menyetujui. Mengunggah bukti belum berarti pembayaran
          diterima. Perpanjangan berlaku setelah tagihan disetujui, menggunakan
          harga bulanan saat pemesanan awal.
        </p>
        <h2>Pembatalan dan checkout</h2>
        <p>
          Pesanan pending tanpa bukti yang sedang ditinjau dapat dibatalkan.
          Jika dana sudah ditransfer, hubungi pengelola terlebih dahulu. Sewa
          aktif memerlukan konfirmasi checkout oleh admin. Aplikasi tidak
          memproses pengembalian dana otomatis atau pembatalan setelah sewa
          aktif.
        </p>
        <h2>Data yang disimpan</h2>
        <p>
          Nama, email, nomor HP, hash password, sesi login, detail pesanan,
          tagihan, bukti transfer, dan laporan digunakan untuk operasional kos.
          Bukti transfer hanya dapat diakses pemilik pesanan dan admin. Hubungi
          pengelola melalui kontak resmi untuk permintaan terkait data akun.
          Jangan memasukkan data sensitif yang tidak diperlukan dalam laporan.
        </p>
        <h2>Aturan properti</h2>
        <p>
          Fasilitas, biaya listrik dan air, deposit, jam tamu, keamanan, dan
          tata tertib harus dikonfirmasi kepada pengelola. Gambar katalog adalah
          ilustrasi. Jadwalkan pemeriksaan kamar jika diperlukan sebelum
          membayar.
        </p>
      </article>
    </PublicLayout>
  );
}
function App() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      requestAnimationFrame(() =>
        document.getElementById(hash.slice(1))?.scrollIntoView(),
      );
    } else window.scrollTo(0, 0);
  }, [pathname, hash]);
  const tenant = (element) => (
    <Guard>
      <DashboardLayout>{element}</DashboardLayout>
    </Guard>
  );
  const admin = (element) => (
    <Guard admin>
      <DashboardLayout admin>{element}</DashboardLayout>
    </Guard>
  );
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/kamar" element={<Catalog />} />
      <Route path="/kamar/:id" element={<RoomDetail />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/register" element={<Auth />} />
      <Route path="/ketentuan" element={<Terms />} />
      <Route path="/akun" element={tenant(<TenantHome />)} />
      <Route path="/akun/tagihan" element={tenant(<TenantInvoices />)} />
      <Route path="/akun/laporan" element={tenant(<Complaints />)} />
      <Route path="/akun/profil" element={tenant(<Profile />)} />
      <Route path="/admin" element={admin(<AdminHome />)} />
      <Route path="/admin/kamar" element={admin(<AdminRooms />)} />
      <Route path="/admin/pesanan" element={admin(<AdminBookings />)} />
      <Route path="/admin/penghuni" element={admin(<AdminTenants />)} />
      <Route path="/admin/keuangan" element={admin(<AdminFinance />)} />
      <Route path="/admin/laporan" element={admin(<Complaints admin />)} />
      <Route path="/admin/profil" element={admin(<Profile />)} />
      <Route
        path="*"
        element={
          <PublicLayout>
            <div className="container section">
              <h1>Halaman tidak ditemukan.</h1>
              <Link className="button" to="/">
                Kembali ke beranda <ArrowRight size={17} />
              </Link>
            </div>
          </PublicLayout>
        }
      />
    </Routes>
  );
}
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Provider>
      <App />
    </Provider>
  </BrowserRouter>,
);

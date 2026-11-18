
import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { supabase } from "../lib/supabaseClient";

function Profile() {
  const [form, setForm] = useState({
    business_name: "",
    phone: "",
    email: "",
    address: "",
    logo_url: "",
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const inputClass =
    "w-full min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white outline-none focus:border-blue-500";

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Sesi login tidak ditemukan. Silakan login kembali.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      setError("Gagal memuat profil bisnis: " + error.message);
    } else if (data) {
      setForm({
        business_name: data.business_name || "",
        phone: data.phone || "",
        email: data.email || "",
        address: data.address || "",
        logo_url: data.logo_url || "",
      });
    }

    setLoading(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleLogoChange(e) {
    const file = e.target.files?.[0];

    if (!file) return;

    setError("");
    setSuccess("");

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Format logo harus PNG, JPG, atau WEBP.");
      e.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Ukuran logo maksimal 2 MB.");
      e.target.value = "";
      return;
    }

    setLogoFile(file);

    const reader = new FileReader();

    reader.onload = () => {
      setLogoPreview(reader.result);
    };

    reader.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!form.business_name.trim()) {
      setError("Nama bisnis wajib diisi.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Sesi login tidak ditemukan. Silakan login kembali.");
      setSaving(false);
      return;
    }

    let logoUrl = form.logo_url;

    // Unggah logo baru jika Admin memilih file
    if (logoFile) {
      const extensions = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/webp": "webp",
      };

      const fileName = `${user.id}/${Date.now()}.${extensions[logoFile.type]}`;

      const { error: uploadError } = await supabase.storage
        .from("business-logos")
        .upload(fileName, logoFile, {
          contentType: logoFile.type,
          upsert: false,
        });

      if (uploadError) {
        setError("Gagal mengunggah logo: " + uploadError.message);
        setSaving(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("business-logos")
        .getPublicUrl(fileName);

      logoUrl = publicUrlData.publicUrl;
    }

    const profileData = {
      user_id: user.id,
      business_name: form.business_name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      logo_url: logoUrl || null,
      updated_at: new Date().toISOString(),
    };

    const { error: saveError } = await supabase
      .from("business_profiles")
      .upsert(profileData, {
        onConflict: "user_id",
      });

    if (saveError) {
      setError("Gagal menyimpan profil bisnis: " + saveError.message);
    } else {
      setForm((prev) => ({
        ...prev,
        logo_url: logoUrl,
      }));

      setLogoFile(null);
      setLogoPreview("");
      setSuccess("Profil bisnis berhasil disimpan.");
    }

    setSaving(false);
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl min-w-0">
        <h2 className="text-xl font-bold text-white sm:text-2xl">
          Profil Bisnis
        </h2>

        <p className="mt-2 text-sm text-slate-300">
          Kelola identitas dan informasi bisnis Anda.
        </p>

        {error && (
          <p className="mt-4 break-words rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </p>
        )}

        {success && (
          <p className="mt-4 break-words rounded-lg bg-green-500/10 p-3 text-sm text-green-400">
            {success}
          </p>
        )}

        {loading ? (
          <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950 p-5 text-slate-300">
            Memuat profil bisnis...
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-5 space-y-5 rounded-lg border border-slate-800 bg-slate-950 p-4 sm:p-6"
          >
            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Nama Bisnis *
              </label>
              <input
                type="text"
                name="business_name"
                value={form.business_name}
                onChange={handleChange}
                placeholder="Masukkan nama bisnis"
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Nomor Telepon
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Contoh: 081234567890"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Email Bisnis
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Contoh: bisnis@email.com"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Alamat Bisnis
              </label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Masukkan alamat bisnis"
                rows="3"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Logo Bisnis
              </label>

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoChange}
                className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white`}
              />

              <p className="mt-2 text-xs text-slate-400">
                Format PNG, JPG, atau WEBP. Ukuran maksimal 2 MB.
              </p>
            </div>

            {(logoPreview || form.logo_url) && (
              <div>
                <p className="mb-2 text-sm text-slate-300">
                  Pratinjau Logo
                </p>

                <img
                  src={logoPreview || form.logo_url}
                  alt="Pratinjau logo bisnis"
                  className="h-24 w-24 rounded-lg border border-slate-700 bg-white object-contain p-2"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 sm:w-auto"
            >
              {saving ? "Menyimpan..." : "Simpan Profil Bisnis"}
            </button>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}

export default Profile;

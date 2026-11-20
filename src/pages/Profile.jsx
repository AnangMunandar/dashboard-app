
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
    "w-full min-w-0 rounded-lg border border-[#C9A96E]/25 bg-[#171717] px-4 py-3 text-sm text-[#F5F1E8] outline-none transition placeholder:text-[#817765] focus:border-[#C9A96E] focus:ring-1 focus:ring-[#C9A96E]/30";

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

    const { data, error: queryError } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (queryError) {
      setError("Gagal memuat profil bisnis: " + queryError.message);
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

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "Sesi login tidak ditemukan. Silakan login kembali."
        );
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
          throw new Error(
            "Gagal mengunggah logo: " + uploadError.message
          );
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
        throw new Error(
          "Gagal menyimpan profil bisnis: " + saveError.message
        );
      }

      setForm((prev) => ({
        ...prev,
        logo_url: logoUrl,
      }));

      setLogoFile(null);
      setLogoPreview("");
      setSuccess("Profil bisnis berhasil disimpan.");
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat menyimpan profil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto min-w-0 max-w-3xl space-y-6">
        {/* HEADER */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A96E]">
            Business Settings
          </p>

          <h1 className="mt-2 text-xl font-bold tracking-tight text-[#F5F1E8] sm:text-2xl">
            Profil Bisnis
          </h1>

          <p className="mt-2 text-sm text-[#A79B86]">
            Kelola identitas dan informasi bisnis Anda.
          </p>
        </div>

        {/* PESAN */}
        {error && (
          <div className="break-words rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="break-words rounded-lg border border-[#C9A96E]/30 bg-[#C9A96E]/10 p-4 text-sm text-[#D8B982]">
            {success}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-[#C9A96E]/20 bg-[#202020] p-6 text-sm text-[#A79B86]">
            Memuat profil bisnis...
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-xl border border-[#C9A96E]/20 bg-[#202020] p-4 shadow-lg sm:p-6"
          >
            <div className="border-b border-[#C9A96E]/15 pb-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#C9A96E]">
                Business Identity
              </p>

              <h2 className="mt-1 text-lg font-semibold text-[#F5F1E8]">
                Informasi Bisnis
              </h2>

              <p className="mt-1 text-sm text-[#A79B86]">
                Lengkapi informasi identitas bisnis Anda.
              </p>
            </div>

            {/* NAMA BISNIS */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[#D8CEBD]">
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

            {/* TELEPON */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[#D8CEBD]">
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

            {/* EMAIL */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[#D8CEBD]">
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

            {/* ALAMAT */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[#D8CEBD]">
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

            {/* LOGO */}
            <div className="border-t border-[#C9A96E]/15 pt-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#C9A96E]">
                Brand Identity
              </p>

              <h3 className="mt-1 text-base font-semibold text-[#F5F1E8]">
                Logo Bisnis
              </h3>

              <p className="mt-1 text-sm text-[#A79B86]">
                Unggah logo untuk identitas bisnis Anda.
              </p>

              <div className="mt-4">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoChange}
                  className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-[#C9A96E] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#17130D]`}
                />

                <p className="mt-2 text-xs text-[#8C8170]">
                  Format PNG, JPG, atau WEBP. Ukuran maksimal 2 MB.
                </p>
              </div>
            </div>

            {/* PRATINJAU LOGO */}
            {(logoPreview || form.logo_url) && (
              <div className="rounded-xl border border-[#C9A96E]/20 bg-[#171717] p-4">
                <p className="mb-3 text-sm font-medium text-[#D8CEBD]">
                  Pratinjau Logo
                </p>

                <div className="flex min-h-32 items-center justify-center rounded-lg border border-[#C9A96E]/10 bg-[#F5F1E8] p-4">
                  <img
                    src={logoPreview || form.logo_url}
                    alt="Pratinjau logo bisnis"
                    className="h-24 w-24 object-contain"
                  />
                </div>
              </div>
            )}

            {/* SIMPAN */}
            <div className="border-t border-[#C9A96E]/15 pt-5">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-[#C9A96E] px-5 py-3 text-sm font-semibold text-[#17130D] transition hover:bg-[#D8B982] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {saving ? "Menyimpan..." : "Simpan Profil Bisnis"}
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}

export default Profile;

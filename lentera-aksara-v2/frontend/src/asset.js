// Menyesuaikan alamat gambar saat situs berada di subfolder (GitHub Pages: /nama-repo/)
export const asset = u => (!u || /^(https?:)?\/\//.test(u)) ? u : import.meta.env.BASE_URL + u.replace(/^\//, '');

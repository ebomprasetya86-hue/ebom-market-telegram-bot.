const TelegramBot = require("node-telegram-bot-api");

const TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

if (!TOKEN) throw new Error("BOT_TOKEN belum diisi.");
if (!ADMIN_CHAT_ID) throw new Error("ADMIN_CHAT_ID belum diisi.");

const bot = new TelegramBot(TOKEN, { polling: true });

const PRODUCTS = [
  { id: 1, name: "Produk 1", price: 6000 },
  { id: 2, name: "Produk 2", price: 10000 },
  { id: 3, name: "Produk 3", price: 15000 }
];

const rupiah = n => new Intl.NumberFormat("id-ID", {
  style:"currency", currency:"IDR", maximumFractionDigits:0
}).format(n);

const carts = new Map();

function menu(chatId) {
  bot.sendMessage(chatId,
`💙 *EBOM MARKET*

Selamat datang! Saya asisten transaksi EBOM MARKET.

Silakan pilih menu:`, {
    parse_mode:"Markdown",
    reply_markup:{inline_keyboard:[
      [{text:"🛍️ Lihat Produk", callback_data:"products"}],
      [{text:"🛒 Keranjang", callback_data:"cart"}],
      [{text:"📞 Hubungi Admin", url:"https://wa.me/628137802589"}]
    ]}
  });
}

function showProducts(chatId) {
  const rows = PRODUCTS.map(p => [{
    text:`🛒 ${p.name} — ${rupiah(p.price)}`,
    callback_data:`buy_${p.id}`
  }]);
  bot.sendMessage(chatId, "🛍️ *DAFTAR PRODUK EBOM MARKET*", {
    parse_mode:"Markdown",
    reply_markup:{inline_keyboard:rows}
  });
}

bot.onText(/\/start/, msg => menu(msg.chat.id));
bot.onText(/\/menu/, msg => menu(msg.chat.id));

bot.on("callback_query", async q => {
  const chatId = q.message.chat.id;
  const data = q.data;

  await bot.answerCallbackQuery(q.id);

  if (data === "products") return showProducts(chatId);

  if (data === "cart") {
    const cart = carts.get(chatId) || [];
    if (!cart.length) return bot.sendMessage(chatId, "🛒 Keranjang kamu masih kosong.");
    const total = cart.reduce((s,p)=>s+p.price,0);
    return bot.sendMessage(chatId,
      "🛒 *KERANJANG*\n\n" +
      cart.map((p,i)=>`${i+1}. ${p.name} — ${rupiah(p.price)}`).join("\n") +
      `\n\n💰 Total: *${rupiah(total)}*`,
      {parse_mode:"Markdown", reply_markup:{inline_keyboard:[
        [{text:"✅ KONFIRMASI PESANAN", callback_data:"confirm"}],
        [{text:"🗑️ Kosongkan", callback_data:"clear"}]
      ]}}
    );
  }

  if (data.startsWith("buy_")) {
    const id = Number(data.split("_")[1]);
    const product = PRODUCTS.find(p=>p.id===id);
    if (!product) return;
    const cart = carts.get(chatId) || [];
    cart.push(product);
    carts.set(chatId, cart);
    return bot.sendMessage(chatId,
      `✅ *${product.name}* ditambahkan ke keranjang.\nHarga: ${rupiah(product.price)}`,
      {parse_mode:"Markdown", reply_markup:{inline_keyboard:[
        [{text:"🛍️ Lanjut Belanja", callback_data:"products"}],
        [{text:"🛒 Lihat Keranjang", callback_data:"cart"}]
      ]}}
    );
  }

  if (data === "clear") {
    carts.delete(chatId);
    return bot.sendMessage(chatId, "🗑️ Keranjang dikosongkan.");
  }

  if (data === "confirm") {
    const cart = carts.get(chatId) || [];
    if (!cart.length) return bot.sendMessage(chatId, "Keranjang masih kosong.");
    const total = cart.reduce((s,p)=>s+p.price,0);
    const user = q.from;
    const order =
`🔔 *PESANAN BARU — EBOM MARKET*

👤 Nama: ${user.first_name || "-"}
🆔 Telegram ID: ${user.id}

${cart.map((p,i)=>`${i+1}. ${p.name} — ${rupiah(p.price)}`).join("\n")}

💰 *TOTAL: ${rupiah(total)}*

Silakan hubungi pembeli untuk proses pembayaran/pengiriman.`;

    await bot.sendMessage(ADMIN_CHAT_ID, order, {parse_mode:"Markdown"});
    carts.delete(chatId);
    return bot.sendMessage(chatId,
      "✅ Pesanan berhasil dikirim ke admin EBOM MARKET.\n\n📞 Admin akan menghubungi kamu untuk proses selanjutnya.");
  }
});

bot.on("polling_error", err => console.error("Polling:", err.message));
console.log("🤖 EBOM MARKET Telegram Bot aktif.");

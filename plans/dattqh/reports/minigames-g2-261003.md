# Lô G2: 25 minigame

Ngày 03/10/2026 · Plan `261003-1549-minigames-home-polish` · Tier L · Danh mục: [`minigame-research-261003.md`](minigame-research-261003.md) §1, §3 (hàng G2).

## Kết quả

- Cả 25 game của hàng G2 đã chơi được bằng một ngón trên iPad ngang, iPad dọc và điện thoại. Mỗi game gồm `apps/web/src/ui/minigame/games/<id>/{logic,draw,index,<id>.test}.ts` và `content/minigames/<id>.json`. Không game nào sửa file dùng chung của khung.
- Bot test: `describeMinigame` chạy 3 màn hình × 5 seed. Bot thắng ở mọi lượt, người không chạm thua ở mọi lượt. Có 10 game chạy thêm một lượt `describeMinigame` với "người chơi kém" (chạm loạn, giữ mãi, ném thẳng…), và người chơi đó phải thua. Mỗi game còn có 2–3 test luật riêng. Tổng: 25 file test, 379 test xanh (`pnpm vitest run` trên 25 file, 3,7 s).
- Không cần thêm hình: chỉ dùng các Fluent Emoji đã có trong `sprites.ts`. Những vật không có emoji (ghế, bát, ấm trà, chảo, ống nước, xe nhìn từ trên, bàn ô ăn quan, bi, cờ, dây) đều vẽ bằng hình khối với màu lấy từ `view.theme`.
- Âm thanh: 5 game dùng nốt tổng hợp của khung (`GameEvent.note`, commit 9c41a3e), không tự viết synth:
  - `drum-beat`: tiếng trống khi gõ giữa mặt, tiếng phách khi gõ viền;
  - `musical-chairs`: một giai điệu thiếu nhi lúc mọi người đi vòng, tiếng còi khi nhạc dừng;
  - `tug-of-war`: tiếng trống theo nhịp "dô ta";
  - `jump-rope`: tiếng chuông, cao dần theo chuỗi nhảy;
  - `fireworks`: tiếng chuông khi pháo nổ.

  Các game còn lại dùng tiếng Kenney theo loại sự kiện.
- Không thêm dependency, không commit.

## Bảng game

Cột "Bot thắng" và "Idle" là khoảng điểm trên 3 màn hình × 8 seed. Ảnh nằm ở `plans/dattqh/reports/minigames-g2-261003/<id>-{landscape,phone}.png`: bot đang chơi, dừng hình ở giây 5–9, nhân vật cáo, đã xem từng ảnh.

| id | Tên | Điều khiển | Mục tiêu / thời gian | Bot thắng | Idle | Người chơi kém (phải thua) |
|---|---|---|---|---|---|---|
| `package-drop` | Thả quà từ máy bay | chạm thả quà, phải thả sớm vì quà còn trôi | 8/12 hộp, 60 s | 11–12 | 0 | — |
| `stick-bridge` | Bắc cầu tre | giữ cho tre dài ra, thả cho tre đổ | 10 khe, 60 s | 24–30 | 0 | — |
| `musical-chairs` | Giành ghế | chạm ghế trống khi nhạc dừng | 5 vòng, 60 s | 10–12 | 0 | chạm liên tục → bị vấp |
| `drum-beat` | Gõ trống hội | chạm giữa mặt trống / viền (2 vùng) | 36 điểm (48 nốt, đúng nhịp 2 điểm), 45 s | 96 | 0 | đập giữa trống liên tục |
| `shell-game` | Úp bát tìm ngọc | chạm bát | 5 lượt đúng, 70 s | 12 | 0 | — |
| `jigsaw` | Ghép tranh | kéo mảnh (hoặc chạm mảnh rồi chạm khung) | 15 mảnh (tranh 6 + 9), 90 s | 216 | 0 | — |
| `pipe-connect` | Nối ống dẫn nước | chạm ô để xoay | 2 bàn (4×4 rồi 5×5), 90 s | 41–45 | 0 | — |
| `block-fit` | Xếp hàng lên xe tải | kéo kiện hàng (hoặc chạm, chạm) | 8 hàng, 90 s | 144–151 | 0 | — |
| `scissor-trace` | Cắt giấy theo đường | kéo kéo theo đường chấm | 5 hình, 60 s | 23–26 | 0 | — |
| `water-pour` | Rót trà đúng vạch | giữ để rót, thả để dừng | 8 cốc, 60 s, 3 tim | 15–17 | 0 | giữ mãi → tràn |
| `blueprint-build` | Xây theo bản vẽ | chạm hũ màu, chạm ô | 3 công trình, 90 s | 29–30 | 0 | — |
| `snowman-roll` | Lăn người tuyết | kéo lăn quả tuyết, thả vào vòng | 6 quả (2 người tuyết), 90 s | 42–45 | 0 | — |
| `traffic-cop` | Điều khiển ngã tư | chạm xe để cho qua | 30 xe, 90 s, 3 tim | 60–66 | 0 | — |
| `basketball` | Ném bóng rổ | vuốt lên (hoặc kéo chậm rồi thả, có đường chấm) | 15 quả, 60 s | 43 | 0 | ném thẳng một lực |
| `rock-climb` | Leo vách đá | chạm mấu bám sáng | 30 m, 60 s | 282–373 | 0 | — |
| `banh-xeo-flip` | Đổ bánh xèo | chạm chảo (đổ, lật, ra đĩa) | 10 bánh, 90 s, 3 tim | 42 | 0 | chạm 3 chảo liên tục |
| `reel-tension` | Kéo cá lớn | giữ nâng hộp xanh, thả cho hộp chìm | 5 cá, 75 s | 18–20 | 0 | giữ mãi |
| `spot-diff` | Tìm điểm khác nhau | chạm | 5 chỗ, 90 s | 240 | 0 | — |
| `hidden-objects` | Tìm đồ ẩn | chạm | 6 món, 90 s | 270 | 0 | — |
| `o-an-quan` | Ô ăn quan | chạm ô + chạm mũi tên, hoặc vuốt ô sang trái/phải | 45 viên, 90 s | 65–106 | 0 | — |
| `marbles` | Bắn bi | kéo ngược rồi thả (như ná) | 5 bi ra khỏi vòng, 8 lượt, 60 s | 5–14 | 0 | — |
| `tug-of-war` | Kéo co | chạm dồn, đúng tiếng hô thì kéo gấp đôi | 3 hiệp, 60 s | 10 | 0 | chạm 2 lần/giây |
| `jump-rope` | Nhảy dây | chạm để nhảy | 25 lần, 60 s | 63 | 0 | chạm liên tục |
| `cuop-co` | Cướp cờ | chạm để chạy khi gọi hình mình, kéo để né | 5 cờ, 90 s | 10–23 | 0 | chạy mọi lượt gọi, không né |
| `fireworks` | Bắn pháo hoa Tết | đặt ngón dưới vòng, giữ cho pháo bay, thả cho nổ | 10 vòng, 16 quả, 60 s | 16–25 | 0 | giữ đến đỉnh trời |

Cân độ khó cho bé: ví dụ kéo co chạm 5 lần/giây thắng 5 hiệp, 3,3 lần/giây chỉ thắng 2 hiệp (mục tiêu 3). Ô ăn quan: người đi ngẫu nhiên được 22–88 viên, bot tham lam được 65–106.

## Chỗ lệch so với danh mục (để cơ chế rõ và không lặp)

- **Thua nhẹ, không dừng giữa chừng**:
  - `block-fit`: hết chỗ xếp thì xe chạy đi, xe trống lùi vào. Lượt chơi không dừng sớm.
  - `shell-game`, `spot-diff`, `hidden-objects`, `jigsaw`, `pipe-connect`, `blueprint-build`: chơi liên tiếp cảnh mới cho đến hết giờ, thay vì dừng ở số lượt cố định. Nhờ vậy vẫn đạt được 2–3 sao, vì sao tính theo 1,4× và 1,8× mục tiêu.
- **Chống chạm loạn** (để "chạm liên tục" không thắng):
  - `musical-chairs`: chạm khi nhạc còn chơi thì bị vấp 1 s;
  - `drum-beat`: gõ khi không có nốt thì trống lạc nhịp 0,25 s;
  - `banh-xeo-flip`: lật hoặc ra đĩa khi bánh chưa vàng thì bánh còn sống, không có điểm;
  - `jump-rope`: sau khi đáp đất phải nghỉ 0,3 s;
  - `traffic-cop`: xe chờ lâu sẽ tự chạy nhưng không có điểm, và có thể đâm xe khác;
  - `spot-diff`, `hidden-objects`: chạm sai thì nghỉ 0,4–0,5 s. Chạm sai 5 lần (hoặc 14 s chưa tìm thấy) thì có gợi ý.
- **Điểm chi tiết hơn số lượt**:
  - `drum-beat`: gõ đúng lúc được 2 điểm, hơi lệch được 1;
  - `snowman-roll`: mỗi quả tuyết chồng đúng được 1 điểm (6 quả = 2 người tuyết);
  - `jump-rope`: điểm là tổng số lần nhảy. Vấp dây thì chuỗi về 0 và dây quay chậm lại;
  - `rock-climb`: điểm là mét cao nhất đã leo, tụt xuống không bị trừ;
  - `o-an-quan`: điểm là số viên ăn được qua các ván, mục tiêu 45 viên;
  - `tug-of-war`: kéo nhiều hiệp liên tiếp, mỗi hiệp thắng thì đội bạn mạnh hơn.
- **Tách khỏi game cùng động tác**:
  - `fireworks` và `stick-bridge` đều là giữ rồi thả. `fireworks` thêm phần ngắm: pháo bay lên từ chỗ đặt ngón, vòng trôi ngang, một quả nổ có thể trúng hai vòng.
  - `basketball` (vuốt) khác `penalty-kick`: độ dài cú vuốt quyết định lực, bóng ngắn hay dài đều trượt, rổ chạy sau 3 quả.
  - Không phải dùng game dự phòng.
- **`cuop-co` rút gọn**: mỗi lượt gọi một hình. Gọi hình của bé thì bé chạm để chạy lấy cờ (cáo đội kia chạy sau 0,75 s), rồi tự chạy về, ngón tay kéo sang trái phải để né chó canh. Gọi hình bạn khác thì bạn đó chạy, bé chạm là bị vấp.
- **Cách gọi bé trong game**: `howTo` dùng `{name}`. Chữ vẽ trên canvas không có tên bé, nên dùng câu chung ("Chạm một ô của bé", "Nhạc chưa dừng mà!"). Không có chữ "Miu" ở đâu cả.

## Kiểm tra

- `pnpm vitest run` trên 25 file test của lô: 25/25 file, 379/379 test xanh.
- `tsc --noEmit -p apps/web/tsconfig.json`: 0 lỗi trong file của lô này. Lần chạy cuối có 2 lỗi trong `games/call-response/draw.ts` (dùng `findLast` không có trong lib ES2022). File đó thuộc lô G5 đang làm dở nên tôi không sửa.
- `eslint --max-warnings=0` trên 25 thư mục: exit 0, 0 cảnh báo.
- `pnpm content:check`: OK, 1100 file (lần chạy cuối).
- Không chạy E2E, full `pnpm test` hay `pnpm --filter @miu/web build`, theo đúng yêu cầu. Phiên chính chạy các bước này.
- Ảnh chụp qua `with-lock` + Vite 5173 `--strictPort`. Sau mỗi lần chụp, server được tắt.

Đã sửa sau khi xem ảnh:
- `shell-game`: viên ngọc lộ ra dưới bát khi bát đang chạy, nay chỉ vẽ ngọc khi bát được nhấc lên.
- `banh-xeo-flip`: tường trống trơn, nay thêm gạch men và kệ nguyên liệu.
- `block-fit`: kiện hàng trong khay quá nhỏ, nay mỗi kiện to tối đa theo ô của nó.
- `o-an-quan`: số đếm của khỉ đè lên bàn, nay chuyển lên hai góc trên.
- `pipe-connect`: giếng và ruộng tràn ra ngoài màn dọc, đã thu gọn.
- `drum-beat`: lời nhắc đè lên HUD ở màn ngang, nay chuyển vào làn nốt.
- `tug-of-war`: đội của bé trôi ra ngoài màn, nay hai đội chỉ dịch nửa quãng của dải đỏ.
- `tug-of-war`, `cuop-co`: đội bạn trùng con vật với bé (bé chọn cáo), nay bỏ con vật của bé khỏi danh sách đội bạn.
- `cuop-co`: thẻ gọi trống trơn giữa các lượt, nay hiện dấu "?". Bé không bị đẩy sát mép nữa nên lá cờ không bị cắt.

## File

Mới, do lô này sở hữu:
- `apps/web/src/ui/minigame/games/<id>/{logic.ts,draw.ts,index.ts,<id>.test.ts}` cho 25 id ở bảng trên (100 file, khoảng 9.100 dòng).
- `content/minigames/<id>.json` (25 file).
- Ảnh trong `plans/dattqh/reports/minigames-g2-261003/`.

Không sửa `sprites.ts`, `sources.json`, `manifest.json`, registry, host hay docs.

## Câu hỏi còn mở / lưu ý cho phiên chính

- `marbles`: bot thấp nhất đúng bằng mục tiêu (5) ở một seed trên điện thoại. Test xanh và xác định (deterministic), nhưng sát ngưỡng. Nếu muốn có dư thì hạ mục tiêu xuống 4 hoặc làm bot giỏi hơn.
- `o-an-quan`: người đi ngẫu nhiên đôi khi cũng đạt 45 viên, vì 90 s đủ cho 2–3 ván. Trò này vốn được xếp "Khó" nên tôi giữ nguyên. Người duyệt có thể muốn chấm theo "thắng máy" thay vì số viên.
- `basketball` không dùng ngẫu nhiên: mọi seed cho cùng một lượt, rổ chạy theo hàm sin.

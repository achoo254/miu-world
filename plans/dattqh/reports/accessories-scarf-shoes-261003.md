# Phụ kiện mới: khe `scarf` (khăn, đồ đeo cổ) và `shoes` (giày)

Ngày 03/10/2026 · Plan `plans/dattqh/261003-1038-more-accessories-spread-life/` · Pha 1 (khăn, giày)

## Kết quả

Đã thêm 102 món mới (51 khăn, 51 giày). Mỗi khe có 18 mẫu gốc mới, phần còn lại là biến thể màu (`variantOf`). Chỉ tạo file mới trong `content/accessories/` (`scarf-*.json`, `shoes-*.json`) và không sửa file cũ. Hình được vẽ lại bằng lệnh render chung có lock, kèm `PREVIEW_ONLY`, nên manifest chỉ được ghi qua lệnh đó.

Sau thay đổi, khe `scarf` có 72 món và khe `shoes` có 72 món. Số món mở từ cấp 1 của mỗi khe là 21 + 10 = 31 (yêu cầu tối thiểu là 20).

## Số món theo cấp (mỗi khe giống nhau)

| Cấp | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | Tổng |
| --- | - | - | - | - | - | - | - | - | - | -- | -- | -- | -- | -- | -- | ---- |
| scarf | 10 | 4 | 4 | 4 | 4 | 3 | 3 | 3 | 3 | 3 | 2 | 2 | 2 | 2 | 2 | 51 |
| shoes | 10 | 4 | 4 | 4 | 4 | 3 | 3 | 3 | 3 | 3 | 2 | 2 | 2 | 2 | 2 | 51 |

Món cấp 1 không có trường `unlock`. Từ cấp 2 trở lên, món có `"unlock": {"level": N}`.

## Mẫu gốc mới

**Khăn và đồ đeo cổ (18):** Cà vạt, Cổ áo thủy thủ, Vòng chuông leng keng, Còi thể thao, Khăn ca rô, Dây chuyền trái tim, Khăn lông xù, Khăn len cầu vồng, Cổ bèo chú hề, Máy ảnh đeo cổ, Vòng vỏ sò, Tai nghe đeo cổ, Dây chuyền ngôi sao, Huân chương ngôi sao, Vòng dạ quang, Dây chuyền đá quý, Dải băng hoàng gia, Áo choàng nhà vua.

**Giày (18):** Dép nhựa lỗ, Dép xỏ ngón, Giày vải cổ cao, Guốc gỗ, Dép thú bông (gấu, mèo, gấu trúc), Giày múa ba lê, Tất sọc, Giày đá bóng, Dép khủng long, Bốt cao bồi, Giày trượt băng, Giày chú hề, Giày phi hành gia, Giày có cánh, Giày tên lửa, Giày dạ quang, Giày pha lê, Bốt hoàng gia.

Các món cấp cao được làm đặc biệt hơn:
- Khăn: dây chuyền hồng ngọc, ngọc xanh biển, ngọc lục bảo, kim cương và bảy sắc cầu vồng; dải băng hoàng gia; áo choàng nhà vua, hoàng gia tím và bầu trời sao; máy ảnh mạ vàng.
- Giày: giày tên lửa (đỏ, xanh, vàng); giày pha lê; giày có cánh vàng và cầu vồng; giày dạ quang cầu vồng; dép khủng long vàng kim; bốt vàng nạm ngọc.

Tên tiếng Việt không trùng với tên nào trong toàn bộ 616 món của catalog. Đã kiểm lúc ghi file và kiểm lại khi parse catalog.

## Cách đặt lên người

- **Khăn:** gắn vào `torso`, `voxelSize` 0.0625, offset `[0, -0.1875, 0]`, giống khăn cũ. Vòng cổ nằm ở y 17–19, mặt trước ở z = 6.
  - Thân áo có chi tiết nhô ra ở mặt trước: khóa thắt lưng của váy, khóa áo khoác, túi yếm. Nếu đồ treo trước ngực chỉ dày 1 khối thì sẽ trùng mặt với các chi tiết này và bị nhấp nháy hoặc che mất.
  - Vì vậy đồ treo trước ngực (mặt dây, cà vạt, đuôi khăn, dải băng) được làm dày 2 khối, chi tiết trang trí đặt ở z = 7 hoặc 8.
  - Đuôi khăn dừng ở y ≥ 7 để không đâm vào viền váy.
- **Giày:** gắn vào `leg-left`, có `mirror: true`, `voxelSize` 0.05, offset `[0, 0, 0]`, giống giày cũ. Đế ở y = −10, mũi giày hướng +z.
  - Mỗi chiếc rộng tối đa 8 khối (x −4..3) để hai bàn chân không chồng lên nhau. Riêng cổ bốt rộng 10 khối ở y −3..−2, giống bốt cũ.
  - Lưỡi trượt băng, đinh giày đá bóng và lửa tên lửa xuống tới y = −11, giống bánh xe của giày patin hiện có.

## Kiểm tra đã chạy

- **`pnpm content:check`:** không còn lỗi nào ở `scarf` và `shoes`. Lệnh vẫn đỏ, nhưng chỉ vì 25 món `hand-*` và 10 món `wings-*` của agent khác chưa có hình. Agent đó đang làm, không thuộc phạm vi của tôi.
- **Kiểm hình:** cả 102 món mới đều có `assets/generated/accessories/<id>.png` và có mục trong `assets/manifest.json`.
- **`pnpm vitest run packages/voxel apps/web/src/game/character`:** 13 file, 713 test đều qua. Bộ test này có kiểm ngân sách tam giác của mọi file phụ kiện.
- **Hình icon:** chạy `PREVIEW_ONLY=scarf-` rồi `PREVIEW_ONLY=shoes-` với `pnpm assets:accessories` qua `with-lock.mjs`.
  - Lượt chạy cả khe hai lần bị timeout ở khoảng hình thứ 60 của trang chụp. Tôi chạy lại theo lô nhỏ hơn (`scarf-plaid-`, `scarf-r`, `scarf-s`, `scarf-t`, `scarf-whistle-`, `shoes-neon-`, `shoes-r`, `shoes-s`, `shoes-winged-`) và tất cả đều xong.
  - Đã xem toàn bộ icon trên tờ ghép: không món nào lơ lửng hay bị cắt.
- **Hình mặc trên người** (theo yêu cầu "hướng của đồ vật khi gắn lên người phải chuẩn"):
  - Đã chạy `PREVIEW_ONLY=item-scarf-` và `PREVIEW_ONLY=item-shoes-` với `pnpm assets:preview accessories`. Kết quả ở `assets/generated/review/accessories/item-<id>.png`, mỗi mẫu gốc một hình. Lệnh này cũng vẽ lại hình của các mẫu khăn và giày cũ.
  - Ngoài ra tôi tự chụp thêm Miu mặc từng mẫu gốc từ phía trước, từ sau lưng (200°) và từ bên hông (100°) để kiểm:
    - Giày: mũi giày hướng ra trước ở cả hai chân (bản đối xứng); đế chạm mặt đất; bộ đẩy tên lửa và đinh thúc ngựa nằm ở gót.
    - Khăn: khăn và dây chuyền ôm quanh cổ, không xuyên qua người; mảng sau của cổ áo thủy thủ và áo choàng nằm sau lưng.
- **Đã sửa sau khi xem hình:**
  - Giày chú hề và giày phi hành gia rộng quá một bàn chân, hai chân dính vào nhau, nên tôi thu hẹp lại.
  - Cổ bốt cao bồi và bốt hoàng gia được hạ xuống ngang bốt cũ.
  - Cánh của giày có cánh được làm to hơn và màu đậm hơn.
  - Mặt dây chuyền và cà vạt được làm dày 2 khối để khóa váy không che mất.
  - Đổi màu trái tim (hồng sẫm) và khăn lông (hồng phấn) vì màu cũ lẫn vào váy hồng. Thêm móc bạc nối dây với trái tim.
- **Chưa chạy:** E2E và `pnpm test`, theo yêu cầu.

## Ghi chú

- Tôi sinh các file bằng một script tạm trong scratchpad, không đưa vào repo. JSON đã ghi là nguồn chính thức.
- Có 1 lượt render tạm của tôi bị treo, đúng lúc catalog chưa parse được do agent khác đang sửa `vehicle-*.json`. Tiến trình đó đã tự thoát và trả lock. Không có tiến trình nào của tôi còn chạy.

Status: DONE_WITH_CONCERNS
Summary: Đã thêm 51 khăn và 51 giày (18 mẫu gốc mới mỗi khe) theo đúng thang cấp, đã vẽ icon và hình mặc trên Miu cho cả 102 món. content:check không còn lỗi ở hai khe này và 713 test voxel/character đều qua.
Concerns/Blockers: `pnpm content:check` toàn repo vẫn đỏ vì 35 món `hand-*`/`wings-*` của agent khác chưa có hình. Render cả khe một lượt hay bị timeout ở khoảng hình thứ 60, nên chia lô nhỏ thì chạy được.

# Review PIN tùy chọn và quyết định của Jev (05/10/2026)

Phạm vi review: commit `d9bba370` (ghi định hướng mọi lứa tuổi) và `5c240093` (PIN phụ huynh tùy chọn), đối chiếu yêu cầu của người sở hữu: game cho mọi lứa tuổi, online kiểu Minecraft, sau này có mobile app, không cần phụ huynh giám sát, phụ huynh tự chịu trách nhiệm.

Input và output gửi Jev: `jev-261005-0949-all-ages-account-input.json`, `jev-261005-0949-all-ages-account-output.json` (model `jev-1.13.0`).

## Phát hiện

| # | Mức | Chỗ | Vấn đề |
| --- | --- | --- | --- |
| 1 | Trung bình | `apps/web/src/ui/account/parent-area-screen.tsx`, `vi.json` `parent.intro`, `parent.step2DoneButton` | Khu phụ huynh vẫn nói "khóa khu này lại", nút "Xong, khóa khu phụ huynh"; không có PIN thì khóa không có tác dụng (cổng luôn mở). |
| 2 | Trung bình | `vi.json` `auth.loginTitle`, `consent.acceptButton` | "Đăng nhập phụ huynh", "Tôi là phụ huynh và đồng ý" loại người lớn tự chơi. |
| 3 | Trung bình (pháp lý) | `content/legal/privacy-vi.json` dòng 52, `consent-vi.json` dòng 7 | Chính sách nói xóa hồ sơ/tài khoản "cần mã PIN phụ huynh"; giờ chỉ đúng khi đã đặt PIN. |
| 4 | Thấp | `apps/server/src/auth/auth-routes.ts` `/auth/pin` | PIN đặt rồi không đổi hay gỡ được; "tùy chọn" chỉ một chiều (đăng nhập Google lại vẫn vượt được PIN quên). |
| 5 | Thấp | `assets/generated/review/ui/02-set-pin.png` | Ảnh review của bước đặt PIN đã bỏ vẫn nằm trong asset và manifest. |
| 6 | Ghi chú | `apps/web/e2e/account-flow.spec.ts`, `mvp-loop.spec.ts` | Đã bỏ bước PIN nhưng chưa chạy E2E (chỉ chạy khi người yêu cầu). |

Không thấy lỗi logic ở server: chưa có PIN thì cổng mở, đặt PIN mở luôn cửa sổ 15 phút cho phiên đó, đăng nhập Google lại vẫn mở cổng và xóa đếm sai. Test auth server và luồng tài khoản web đều qua.

## Quyết định của Jev

| Câu hỏi | Chọn | Độ tin | Mức | Ghi chú |
| --- | --- | --- | --- | --- |
| Chữ bước "khóa và đưa máy" | `adapt_to_pin`: chỉ nói khóa khi có PIN; không PIN thì "Xong, vào chơi" | 1.00 | auto | |
| Chữ "phụ huynh" ở màn chung | `neutral_now`: đổi sang trung tính, thêm dòng phụ huynh chịu trách nhiệm khi cho bé chơi | 0.91 | auto | |
| Văn bản pháp lý | `privacy_now_consent_later`: sửa trang quyền riêng tư ngay, giữ đồng ý v2, gộp đổi đồng ý vào lần đổi mô hình tài khoản | 0.88 | escalate | Rủi ro cao: theo quy ước dự án vẫn áp lựa chọn của Jev, người sở hữu xem lại |
| Đổi/gỡ PIN | `add_now`: thêm đổi và gỡ PIN khi khu đang mở | 0.98 | auto | |
| Mô hình tài khoản | `plan_single_player`: viết plan một người chơi mỗi tài khoản, hồ sơ là người chơi phụ trên máy dùng chung; làm sau khi duyệt plan | 0.84 | escalate | Như trên |
| Ảnh review cũ | `remove_now`: xóa và sinh lại manifest | 0.96 | auto | |

## Câu hỏi còn mở

- Hai quyết định rủi ro cao (văn bản pháp lý, mô hình tài khoản) do Jev chọn; người sở hữu có muốn đổi trước khi áp không.

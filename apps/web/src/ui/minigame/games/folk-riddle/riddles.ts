// Riddles in the folk style for class 2 ("Con gì đuôi ngắn tai dài…"), short lines revealed one at a time.
// Every answer is a picture the minigames have, so the child answers by tapping it.
import type { SpriteRef } from '../../sprites';

export interface Riddle {
  lines: readonly string[];
  answer: SpriteRef;
  /** The answer's name under its picture. */
  word: string;
}

export const RIDDLES: readonly Riddle[] = [
  { lines: ['Con gì đuôi ngắn tai dài', 'Mắt hồng lông mượt', 'Có tài chạy nhanh?'], answer: 'rabbit', word: 'con thỏ' },
  { lines: ['Con gì mào đỏ', 'Lông mượt như tơ', 'Sáng sớm tinh mơ', 'Gọi người thức dậy?'], answer: 'chicken', word: 'con gà' },
  { lines: ['Con gì ăn no', 'Bụng to mắt híp', 'Mồm kêu ụt ịt', 'Nằm thở phì phò?'], answer: 'pig', word: 'con lợn' },
  { lines: ['Con gì bé tí', 'Chăm chỉ suốt ngày', 'Bay khắp vườn cây', 'Tìm hoa làm mật?'], answer: 'honeybee', word: 'con ong' },
  { lines: ['Con gì chân ngắn', 'Mà lại có màng', 'Mỏ bẹt màu vàng', 'Hay kêu cạp cạp?'], answer: 'duck', word: 'con vịt' },
  { lines: ['Con gì tám cẳng', 'Hai càng to khỏe', 'Chẳng đi mà lại', 'Bò ngang cả ngày?'], answer: 'crab', word: 'con cua' },
  { lines: ['Con gì kêu meo meo', 'Leo trèo nhanh nhẹn', 'Rình bắt chuột nhắt?'], answer: 'cat', word: 'con mèo' },
  { lines: ['Con gì thức suốt đêm thâu', 'Canh nhà cho chủ', 'Thấy lạ sủa gâu gâu?'], answer: 'dog-face', word: 'con chó' },
  { lines: ['Con gì đầu có hai sừng', 'Da đen bóng mượt', 'Kéo cày ngoài đồng?'], answer: 'water-buffalo', word: 'con trâu' },
  { lines: ['Con gì bò chậm thật chậm', 'Cõng nhà trên lưng', 'Đi đâu cũng mang theo?'], answer: 'snail', word: 'con ốc sên' },
  { lines: ['Con gì leo trèo giỏi', 'Thích ăn chuối', 'Hay nhăn mặt làm trò?'], answer: 'monkey-face', word: 'con khỉ' },
  { lines: ['Quả gì vỏ xanh', 'Ruột đỏ như son', 'Hạt đen nho nhỏ', 'Ăn vào mát ngon?'], answer: 'watermelon', word: 'dưa hấu' },
  { lines: ['Quả gì cong cong', 'Chín vàng ươm', 'Mọc thành từng nải?'], answer: 'banana', word: 'quả chuối' },
  { lines: ['Cái gì tròn tròn', 'Treo ở trên cao', 'Ban ngày chói lọi', 'Tối lặn đi đâu?'], answer: 'sun', word: 'mặt trời' },
  { lines: ['Cái gì bảy sắc', 'Cong cong trên trời', 'Hiện ra sau mưa?'], answer: 'rainbow', word: 'cầu vồng' },
  { lines: ['Quả gì mình đầy mắt', 'Đầu đội mũ lá xanh', 'Ăn vào ngọt thơm?'], answer: 'pineapple', word: 'quả dứa' },
  { lines: ['Con gì không có chân', 'Thở bằng mang', 'Bơi lội dưới nước?'], answer: 'fish', word: 'con cá' },
  { lines: ['Con gì ăn cỏ', 'Kêu ụm bò', 'Cho ta sữa uống?'], answer: 'cow', word: 'con bò' },
  { lines: ['Con gì cánh mỏng', 'Sặc sỡ nhiều màu', 'Bay lượn vườn hoa?'], answer: 'butterfly', word: 'con bướm' },
  { lines: ['Con gì mang mai cứng', 'Bò chậm từ từ', 'Sợ thì rụt cổ?'], answer: 'turtle', word: 'con rùa' },
  { lines: ['Cái gì có cánh', 'Mà chẳng có lông', 'Chở người bay qua mây?'], answer: 'airplane', word: 'máy bay' },
  { lines: ['Cái gì mở ra khi mưa', 'Che cho khỏi ướt', 'Tạnh thì gấp lại?'], answer: 'umbrella', word: 'cái ô' },
];

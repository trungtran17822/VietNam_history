/**
 * lesson-data.js - Seed curriculum lesson data
 * Full curriculum content with sections, questions, key notes, private notes,
 * 3D simulation variables, props config, camera keyframes, and status.
 */

(function (window) {
  'use strict';

  const SEED_LESSONS = [
    {
      id: 'ngoc-hoi-ha-hoi-1789',
      title: 'Trận Ngọc Hồi - Hạ Hồi (Mùa xuân 1789)',
      subtitle: 'Đại thắng mùa xuân Kỷ Dậu 1789 - Hoàng đế Quang Trung đại phá 29 vạn quân Mãn Thanh',
      commander: 'Hoàng đế Quang Trung (Nguyễn Huệ)',
      opponent: '29 vạn quân Mãn Thanh (Tôn Sĩ Nghị, Sầm Nghi Đống, Hứa Thế Hanh)',
      year: 'Mùa xuân Kỷ Dậu (1789)',
      teacher: 'Thầy Nguyễn Văn Hưng',
      class: 'Lớp 11A1',
      date: '2026-10-27', // Today
      subject: 'Lịch sử',
      grade: 'Khối 11',
      period: 'Tiết 2 · 08:15 - 09:00 (45 phút)',
      objectives: 'Phân tích nghệ thuật quân sự thần tốc của vua Quang Trung; so sánh hiệu quả các phương án tác chiến qua mô phỏng 3D tương tác và rèn luyện tư duy phản biện.',
      focusQuestion: 'Hoàng đế Quang Trung đã hóa giải ưu thế hỏa lực và thành lũy của 29 vạn quân Mãn Thanh bằng những quyết định chiến thuật then chốt nào?',
      status: 'Đã dạy', // 'Nháp' | 'Đã lên lịch' | 'Đã dạy'
      isPilot: true,
      disclaimer: 'Nội dung minh họa, chưa được chuyên gia duyệt',
      simulationDisclaimer: 'ĐÂY LÀ MÔ PHỎNG DỰA TRÊN Ý KIẾN CỦA HỌC SINH VÀ SỰ KIỆN THỰC TẾ, KHÔNG PHẢI SỰ THẬT LỊCH SỬ. Mọi số liệu là minh họa từ giả định toán học nhằm kích thích tư duy phản biện.',
      introSummary: 'Vào dịp Tết Kỷ Dậu 1789, vua Quang Trung thực hiện cuộc hành quân thần tốc từ Phú Xuân ra Bắc, chia quân thành 5 đạo bất ngờ vây đồn Hạ Hồi và tổng công kích đồn Ngọc Hồi, tiêu diệt hoàn toàn cứ điểm phòng ngự kiên cố nhất của địch chỉ trong sáng mùng 5 Tết.',
      sections: [
        {
          id: 'sec-1',
          title: 'Bao vây bí mật đồn Hạ Hồi (Thường Tín)',
          narration: 'Đại quân Tây Sơn bí mật tiếp cận và vây kín đồn Hạ Hồi trong đêm sương mù. Quân ta bắc loa gào thét, khua chiêng gõ trống vang dội như có hàng vạn quân. Quân Thanh trong đồn kinh hồn bạt vía, không kịp trở tay, toàn bộ đầu hàng mà không tốn một mũi tên hòn đạn.',
          caption: 'Nửa đêm mùng 3 Tết: Đồn Hạ Hồi bị vây chặt bằng tâm lý chiến, quân Thanh ra hàng không tốn một mũi tên.',
          timelineRange: 0.05,
          timeLabel: 'Nửa đêm Mùng 3 Tết',
          source: {
            book: 'Đại Nam chính biên liệt truyện',
            chapter: 'Quyển 30 - Ngụy Tây liệt truyện',
            quote: 'Nửa đêm ngày mồng 3 tháng giêng năm Kỷ Dậu, quân đến làng Hạ Hồi... liền ngầm vây kín làng ấy, rồi bắc loa gọi dạ... Trong đồn ai nấy rụng rời sợ hãi, liền kéo nhau ra xin hàng.',
            note: 'Nguồn chính sử triều Nguyễn ghi nhận tài tâm lý chiến tuyệt hảo của vua Quang Trung.'
          }
        },
        {
          id: 'sec-2',
          title: 'Áp sát cứ điểm then chốt Ngọc Hồi & Đầm Mực',
          narration: 'Đồn Ngọc Hồi được quân Thanh gia cố chông sắt, hỏa hổ và đại bác liên hoàn. Vua Quang Trung chia quân: Đô đốc Bảo chỉ huy cánh quân vu hồi mai phục sẵn ở Đầm Mực (Quỳnh Đô) chặn đường rút lui; đại quân chủ lực áp sát trực diện tiền tiêu trong bóng đêm dày đặc.',
          caption: 'Đêm mùng 4 rạng mùng 5: Đô đốc Bảo ém quân mật phục ở Đầm Mực, siết chặt thòng lọng đón lõng giặc.',
          timelineRange: 0.35,
          timeLabel: 'Đêm Mùng 4 rạng Mùng 5 Tết',
          source: {
            book: 'Hoàng Lê nhất thống chí',
            chapter: 'Hồi thứ 14',
            quote: 'Vua Quang Trung sai đại đô đốc Bảo đem quân theo đường tắt từ làng Đại Áng tới thẳng Đầm Mực để phục sẵn đón đường giặc chạy lui.',
            note: 'Thế trận gọng kìm chia cắt tiêu diệt triệt để tàn quân đối phương.'
          }
        },
        {
          id: 'sec-3',
          title: 'Voi chiến tiên phong - Khiên rơm ướt phá tan hỏa công',
          narration: 'Trời tờ mờ sáng mùng 5, hơn 100 thớt voi chiến Tây Sơn chở đại bác và dũng sĩ xông trận mở đường. Phía sau, các tráng sĩ kết 20 người một nhóm, vác những tấm ván bện rơm dày tẩm ướt nước che chở làn tên mũi đạn, đại bác quân Thanh bắn ra đều bị rơm ướt dập tắt lửa. Khi giáp chiến lũy, dũng sĩ quẳng khiên rút đoản đao tràn vào xáp lá cà.',
          caption: 'Mờ sáng mùng 5: Sáng kiến khiên rơm ướt và 100 thớt voi chiến đè bẹp hỏa lực liên hoàn đồn Ngọc Hồi.',
          timelineRange: 0.70,
          timeLabel: 'Mờ sáng Mùng 5 Tết',
          source: {
            book: 'Khâm định Việt sử thông giám cương mục',
            chapter: 'Chính biên, Quyển 47',
            quote: 'Lấy sáu chục tấm ván, cứ ghép liền hai tấm làm một bức, bên ngoài lấy rơm dấp nước bọc kín... Hai mươi người giắt dao ngắn khiêng một bức ván... Quân Thanh bắn súng ra không trúng ai cả.',
            note: 'Phát kiến sáng tạo từ đời sống nông dân hóa giải vũ khí hỏa lực tối tân thời bấy giờ.'
          }
        },
        {
          id: 'sec-4',
          title: 'Đập tan đồn Ngọc Hồi - Khải hoàn Thăng Long',
          narration: 'Tướng giặc Hứa Thế Hanh đền tội, quân Thanh tháo chạy hỗn loạn sa lầy vào Đầm Mực và bị đạo quân Đô đốc Bảo tiêu diệt gọn. Cùng lúc đó tại Đống Đa, cánh quân Đô đốc Long tập kích thần tốc khiến Sầm Nghi Đống thắt cổ tự vẫn. Trưa mùng 5 Tết, Hoàng đế Quang Trung mặc áo bào sạm màu thuốc súng dẫn đầu đại quân ca khúc khải hoàn tiến vào Thăng Long.',
          caption: 'Trưa mùng 5 Tết: Đại thắng khải hoàn giải phóng kinh thành Thăng Long sớm hơn 2 ngày dự kiến.',
          timelineRange: 1.00,
          timeLabel: 'Chính trưa Mùng 5 Tết',
          source: {
            book: 'Lịch sử Việt Nam (Tập 4)',
            chapter: 'Phong trào Tây Sơn và sự nghiệp thống nhất đất nước',
            quote: 'Trưa ngày mùng 5 Tết Kỷ Dậu, đại quân Tây Sơn tiến vào kinh thành Thăng Long trong niềm hoan ca của nhân dân. Áo bào của Hoàng đế Quang Trung nhuộm đen khói súng.',
            note: 'Khải hoàn ca chói lọi của phong trào khởi nghĩa nông dân Tây Sơn.'
          }
        }
      ],
      keyNotes: [
        'Chiến dịch giải phóng Thăng Long mùa xuân Kỷ Dậu 1789 là đỉnh cao nghệ thuật quân sự thần tốc, táo bạo, bất ngờ của dân tộc ta.',
        'Nghệ thuật hiệp đồng binh chủng mẫu mực: Kết hợp uy lực đột phá của tượng binh voi chiến, lá chắn cơ động của bộ binh và đòn vu hồi mai phục bí mật.',
        'Sáng kiến trang bị từ nhân dân: Tấm ván bện rơm ướt hấp thụ mảnh đạn gang và dập tắt lửa hỏa cầu hỏa mai, biến vũ khí đồn lũy quân Thanh thành vô hại.',
        'Thế trận đón lõng Đầm Mực: Bắt trúng tâm lý tháo chạy của quân giặc, biến địa hình đầm lầy tự nhiên thành mồ chôn tàn quân, không để giặc chạy về Thăng Long hội quân.'
      ],
      privateNotes:
        'Sổ tay Sư phạm Nội bộ (Giáo viên):\n- Hướng dẫn học sinh tập trung so sánh được - mất (trade-offs) ở giai đoạn 3 và 4.\n- Nhắc học sinh quan sát sự tương tác giữa voi chiến và chông rào lũy.\n- Tại bước 5 (So sánh), nhấn mạnh rõ ràng với cả lớp: các con số tổn thất và thời gian là mô hình giả lập toán học, kích thích phản biện, không thay thế tài liệu lịch sử chính thống.\n- Câu hỏi mở ở cuối tiết: Yêu cầu học sinh liên hệ bài học sáng tạo từ thực tiễn sản xuất của cha ông vào công cuộc xây dựng đất nước ngày nay.',
      questions: [
        {
          id: 'q-1',
          text: 'Tại sao sáng kiến ghép ván bọc rơm ướt lại vô hiệu hóa được hỏa lực súng đại bác và hỏa hổ của quân Thanh tại đồn Ngọc Hồi?',
          type: 'multiple_choice',
          sectionId: 'sec-3',
          isEmperorQuestion: false,
          isExplanationReleased: true,
          options: [
            {
              id: 'opt-1-a',
              text: 'Rơm ướt dập tắt ngòi nổ và hấp thụ nhiệt lượng, cản mảnh gang đạn đại bác tầm gần',
              isCorrect: true,
              explanation: 'Rơm tẩm ướt nước dày đặc tạo nên lớp đệm đàn hồi triệt tiêu sức nổ của hỏa cầu hỏa mai và cản mảnh đạn xé của đại pháo.'
            },
            {
              id: 'opt-1-b',
              text: 'Vì rơm ướt làm hơi nước bốc lên làm ướt súng giặc trên thành',
              isCorrect: false,
              explanation: 'Quân Thanh ở trên tường lũy khô ráo, không bị ảnh hưởng hơi nước từ khiên dưới đất.'
            },
            {
              id: 'opt-1-c',
              text: 'Vì tấm ván quá nhẹ giúp binh sĩ chạy nhanh hơn tốc độ viên đạn',
              isCorrect: false,
              explanation: 'Tấm ván bọc rơm ướt do 20 tráng sĩ khiêng rất nặng, đánh đổi tốc độ cơ động để lấy sự che chắn tuyệt đối.'
            }
          ]
        },
        {
          id: 'q-2',
          text: 'Việc vua Quang Trung cho Đô đốc Bảo ém quân bí mật tại Đầm Mực (Quỳnh Đô) nhằm mục đích chiến lược nào?',
          type: 'multiple_choice',
          sectionId: 'sec-2',
          isEmperorQuestion: false,
          isExplanationReleased: false, // Hidden until teacher releases
          options: [
            {
              id: 'opt-2-a',
              text: 'Đón lõng, dồn ép và tiêu diệt hoàn toàn đường rút lui của tàn quân Ngọc Hồi, tránh để chúng hội quân',
              isCorrect: true,
              explanation: 'Đầm Mực là bãi sình lầy tự nhiên; khi đồn Ngọc Hồi vỡ, tàn quân giặc tháo chạy sẽ bị sa lầy và rơi trọn vào ổ mai phục của Đô đốc Bảo.'
            },
            {
              id: 'opt-2-b',
              text: 'Bảo vệ kho lương dự phòng của quân Tây Sơn tại phía Nam Thăng Long',
              isCorrect: false,
              explanation: 'Đầm Mực là trận địa phục kích tiền tuyến, không phải hậu cứ kho lương.'
            },
            {
              id: 'opt-2-c',
              text: 'Để nghi binh thu hút hỏa lực của quân Mãn Thanh khỏi đồn Ngọc Hồi',
              isCorrect: false,
              explanation: 'Đạo quân Đô đốc Bảo ẩn náu hoàn toàn bí mật, không hề nổ súng nghi binh cho đến khi quân Thanh tháo chạy tới.'
            }
          ]
        },
        {
          id: 'q-3',
          text: 'Nếu là một người cầm quân năm 1789, em sẽ phân tích bài học gì về việc chọn thời điểm xuất kích vào đúng dịp Tết Nguyên Đán?',
          type: 'open_discussion',
          sectionId: 'sec-1',
          isEmperorQuestion: true, // King asks this question!
          isExplanationReleased: true,
          guide: 'Gợi mở thảo luận: Yếu tố bất ngờ tuyệt đối khi quân địch say sưa tiệc tùng; sự đánh đổi tinh thần nhớ quê hương của quân sĩ thành quyết tâm đánh nhanh thắng nhanh để về đoàn tụ sum vầy.'
        }
      ],
      baseline: {
        durationHours: 36,
        casualties: 1800,
        positionScore: 95,
        ratingText: 'Chuẩn mực thần tốc lịch sử'
      },
      simulation: {
        propsConfig: {
          palisade: true,
          tents: true,
          elephants: true,
          banners: true,
          fire: true,
          village: true,
          bamboo: true,
          river: true
        },
        unitCounts: {
          taySonInfantry: 48,
          taySonElephants: 6,
          qingInfantry: 54,
          qingCannons: 6
        },
        factionColors: {
          taySon: '#962d22',
          qing: '#1e3a8a'
        },
        cameraPresets: {
          overview: { pos: [0, 72, 115], target: [0, 5, -8] },
          follow_troops: { pos: [-25, 20, 45], target: [0, 8, 5] },
          close_up: { pos: [12, 14, 18], target: [15, 6, 2] },
          top_down: { pos: [0, 110, 5], target: [0, 0, 0] }
        },
        keyframes: [
          { time: 0.0, preset: 'overview' },
          { time: 0.35, preset: 'follow_troops' },
          { time: 0.70, preset: 'close_up' },
          { time: 1.0, preset: 'overview' }
        ]
      },
      question: {
        character: {
          name: 'Hoàng đế Quang Trung',
          dynasty: 'Nhà Tây Sơn (1788 - 1792)',
          avatarSvg: 'emperor_quang_trung',
          greeting: 'Hỡi các sĩ tử tương lai của nước Việt!',
          speech: 'Năm xưa, Trẫm cùng ba quân đã chọn lối đánh thần tốc bất ngờ, sáng tạo khiên rơm ướt phá hỏa công và dùng tượng binh dũng mãnh đập tan đồn lũy Ngọc Hồi trong dịp Tết. Nếu là các con đứng trước bờ cõi năm ấy, các con sẽ làm khác Trẫm ở điểm nào?'
        },
        variables: [
          {
            id: 'direction',
            title: '1. Hướng tiến công & Phân bổ mũi nhọn',
            description: 'Lựa chọn bố trí hướng đột kích và cánh quân phối hợp',
            options: [
              {
                id: 'flanking_multidirectional',
                isOriginal: true,
                name: 'Đa mũi giáp công: Ngọc Hồi chính diện + Đầm Mực vu hồi (Cách gốc)',
                shortName: 'Đa mũi giáp công kết hợp vu hồi',
                desc: 'Tấn công thẳng đồn Ngọc Hồi đồng thời cho một cánh quân mật phục tại Đầm Mực chặn đường rút và một cánh vu hồi Đống Đa.',
                timeDelta: 0,
                casualtyDelta: 0,
                positionScoreDelta: 0,
                assumptions: 'Đòi hỏi kỷ luật liên lạc cao độ nhưng chia cắt hoàn toàn tuyến phòng ngự và tiêu diệt tàn quân đối phương.'
              },
              {
                id: 'frontal_allout',
                isOriginal: false,
                name: 'Dồn toàn lực công phá chính diện Ngọc Hồi',
                shortName: 'Dồn toàn lực công phá chính diện',
                desc: 'Tập trung 100% binh hỏa lực đánh vỗ mặt vào phòng tuyến Ngọc Hồi mà không phân tán sang Đầm Mực hay cánh vu hồi.',
                timeDelta: 8,
                casualtyDelta: 950,
                positionScoreDelta: -18,
                assumptions: 'Hỏa lực đồn lũy quân Thanh rất mạnh (đại bác, chông sắt); đòn vỗ mặt trực diện khiến quân ta chịu thiệt hại nặng nề trước chiến lũy, địch thua chạy có đường tẩu thoát về Thăng Long hội quân với Tôn Sĩ Nghị.'
              },
              {
                id: 'siege_starvation',
                isOriginal: false,
                name: 'Bao vây cô lập dài ngày, triệt hạ tiếp tế',
                shortName: 'Vây hãm cô lập dài ngày',
                desc: 'Không vội tấn công đẫm máu, đào hào bao vây chặt đồn lũy chờ quân Thanh cạn kiệt lương thảo tự tan rã.',
                timeDelta: 72,
                casualtyDelta: -400,
                positionScoreDelta: -35,
                assumptions: 'Giảm được thương vong trực tiếp ban đầu nhưng làm mất hoàn toàn yếu tố thần tốc; cho phép Tôn Sĩ Nghị ở Thăng Long có đủ thời gian điều viện binh 20 vạn quân Nam tiến phản công kẹp ta vào giữa.'
              }
            ]
          },
          {
            id: 'timing',
            title: '2. Thời điểm mở màn đại công kích',
            description: 'Thời khắc khai hỏa tấn công quyết định yếu tố thời cơ',
            options: [
              {
                id: 'dawn_tet5',
                isOriginal: true,
                name: 'Thần tốc mờ sáng mùng 5 Tết khi địch chủ quan (Cách gốc)',
                shortName: 'Mờ sáng mùng 5 Tết (Bất ngờ)',
                desc: 'Tấn công trong dịp Tết khi quan quân Mãn Thanh đang say sưa tiệc tùng, lơ là cảnh giác.',
                timeDelta: 0,
                casualtyDelta: 0,
                positionScoreDelta: 0,
                assumptions: 'Khai thác tối đa sự suy giảm cảnh giác của đối phương trong dịp Tết cổ truyền; gây hoảng loạn tâm lý tột độ.'
              },
              {
                id: 'midday_light',
                isOriginal: false,
                name: 'Tấn công vào giữa trưa trời sáng rõ',
                shortName: 'Tấn công giữa trưa trời sáng rõ',
                desc: 'Chờ trời sáng tỏ, tầm nhìn quang đãng để ba quân dễ hiệp đồng tác chiến và quan sát chướng ngại vật.',
                timeDelta: 12,
                casualtyDelta: 600,
                positionScoreDelta: -14,
                assumptions: 'Tầm nhìn tốt giúp ta quan sát địa hình nhưng quân Thanh cũng phát hiện đội hình tiếp cận từ rất xa, súng đại bác trên lũy phát huy hỏa lực tối đa từ cự ly xa.'
              },
              {
                id: 'after_fullmoon',
                isOriginal: false,
                name: 'Chờ sau rằm tháng Giêng mới xuất quân',
                shortName: 'Chờ qua rằm tháng Giêng (Dưỡng sức)',
                desc: 'Cho quân sĩ nghỉ ngơi ăn Tết đầy đủ, tập luyện kỹ càng rồi mới tiến quân công đồn.',
                timeDelta: 120,
                casualtyDelta: 1100,
                positionScoreDelta: -40,
                assumptions: 'Quân ta có thể lực tốt hơn nhưng quân Thanh đã hoàn thành việc củng cố công sự kiên cố quanh Thăng Long và viện binh từ Lưỡng Quảng có thời gian chi viện.'
              }
            ]
          },
          {
            id: 'shield',
            title: '3. Phương thức che chắn trước hỏa lực phòng thủ',
            description: 'Giải pháp đối phó chông sắt, súng hỏa mai và đại bác',
            options: [
              {
                id: 'wet_straw_shields',
                isOriginal: true,
                name: 'Khiên ván bện rơm ướt dày 20 người khiêng (Cách gốc)',
                shortName: 'Khiên ván bện rơm ướt chống hỏa công',
                desc: 'Ghép ván gỗ, bọc rơm dấp nước dày đặc; đạn súng và lửa của địch bắn vào đều bị tắt ngấm.',
                timeDelta: 0,
                casualtyDelta: 0,
                positionScoreDelta: 0,
                assumptions: 'Rơm ướt hấp thụ lực va chạm của mảnh đạn và dập tắt hoàn toàn mồi lửa hỏa tiễn, bảo vệ an toàn cho mũi nhọn đột phá.'
              },
              {
                id: 'standard_wood_shields',
                isOriginal: false,
                name: 'Khiên gỗ bọc da thông thường (Nhẹ hơn, cơ động)',
                shortName: 'Khiên gỗ bọc da thông thường',
                desc: 'Trang bị khiên chiến tiêu chuẩn cho từng cá nhân, di chuyển linh hoạt và nhanh nhẹn hơn tấm ván nặng.',
                timeDelta: -4,
                casualtyDelta: 850,
                positionScoreDelta: -15,
                assumptions: 'Tốc độ cơ động cao hơn 15% nhưng khiên gỗ mỏng và da thuộc dễ bốc cháy khi trúng hỏa cầu, không cản được đạn gang đại bác tầm gần của đồn lũy.'
              },
              {
                id: 'dispersed_rush',
                isOriginal: false,
                name: 'Không mang ván nặng, phân tán tản mát chạy nhanh áp sát',
                shortName: 'Phân tán tản mát chạy nhanh áp sát',
                desc: 'Tận dụng tốc độ cá nhân, phân tán tránh pháo kích rồi nhanh chóng vượt hào chông xông lên mặt lũy.',
                timeDelta: -6,
                casualtyDelta: 1400,
                positionScoreDelta: -28,
                assumptions: 'Áp sát lũy rất nhanh nhưng trước mật độ chông sắt dày đặc và hỏa lực bắn rát dồn dập, đội hình tản mát khó tạo ra sức công phá xuyên thủng cổng thành.'
              }
            ]
          },
          {
            id: 'elephants',
            title: '4. Cách phối hợp thớt voi chiến (Tượng binh)',
            description: 'Cách thức khai thác 100 thớt voi chiến uy mãnh của Tây Sơn',
            options: [
              {
                id: 'elephants_vanguard',
                isOriginal: true,
                name: '100 voi chiến tiên phong mở đường dẫm nát chiến lũy (Cách gốc)',
                shortName: '100 voi chiến tiên phong mở đường',
                desc: 'Đặt đại pháo trên lưng voi, xung phong húc đổ cổng lũy và làm khiếp đảm chiến mã của kỵ binh giặc.',
                timeDelta: 0,
                casualtyDelta: 0,
                positionScoreDelta: 0,
                assumptions: 'Khối lượng và sức mạnh của voi chiến phá tan chông rào, tiếng gầm và mùi voi làm ngựa giặc hoảng loạn mất kiểm soát; tạo đà tâm lý áp đảo.'
              },
              {
                id: 'elephants_reserve',
                isOriginal: false,
                name: 'Giữ voi chiến làm dự bị phía sau, chỉ tung vào truy kích',
                shortName: 'Giữ voi chiến làm dự bị phản kích',
                desc: 'Để bộ binh phá cổng lũy trước; voi chiến giữ sức phía sau để đề phòng giặc phản công hoặc dùng khi truy đuổi.',
                timeDelta: 6,
                casualtyDelta: 550,
                positionScoreDelta: -12,
                assumptions: 'Bảo toàn được lực lượng tượng binh quý giá nhưng bộ binh công thành thiếu hỏa lực đột phá cơ giới hạng nặng, thời gian phá lũy bị kéo dài.'
              },
              {
                id: 'cavalry_instead',
                isOriginal: false,
                name: 'Thay bằng toàn bộ kỵ binh ngựa cho tốc độ thần tốc',
                shortName: 'Dùng kỵ binh ngựa thay cho voi chiến',
                desc: 'Sử dụng kỵ binh linh hoạt đánh tạt sườn để tăng tốc độ vận động chiến.',
                timeDelta: -2,
                casualtyDelta: 1200,
                positionScoreDelta: -24,
                assumptions: 'Ngựa chiến dễ bị sập bẫy chông sắt và hỏa hổ làm kinh hãi; không đủ thể trọng để ủi sập tường đất kiên cố của đồn Ngọc Hồi.'
              }
            ]
          }
        ]
      },
      explanations: {
        intro: 'Hỡi các tráng sĩ trẻ tuổi! Lòng dũng cảm và tinh thần phản biện dám nghĩ khác của các con khiến Trẫm vô cùng khâm phục.',
        variableFeedbacks: {
          direction: {
            flanking_multidirectional: 'Con đã nhìn ra tầm quan trọng của việc diệt cỏ phải nhổ tận gốc. Ém quân Đầm Mực chính là chiếc khóa then cài chặt số phận tướng giặc.',
            frontal_allout: 'Đánh vỗ mặt chính diện thể hiện khí phách ngút trời, nhưng tường cao hào sâu của giặc đã cướp đi quá nhiều máu xương của tráng sĩ, lại để tướng giặc mở đường máu tháo chạy về Thăng Long.',
            siege_starvation: 'Kế vây thành chờ giặc đói là kế sách sách vở cổ điển. Song đối đầu với 29 vạn quân giặc, dây dưa dài ngày chính là tự trói tay mình chờ giặc từ phương Bắc tràn xuống kẹp ta vào giữa.'
          },
          timing: {
            dawn_tet5: 'Chọn lúc mờ sáng mùng 5 Tết, khi kẻ thù chìm trong chén rượu xuân say mèm, chính là nắm chắc binh pháp: "Bất ngờ xuất hiện nơi địch không phòng bị".',
            midday_light: 'Tấn công giữa trưa tuy sáng rõ đường đi lối lại nhưng đã trao cho đại pháo giặc cự ly ngắm bắn hoàn hảo, khiến quân ta trúng đạn pháo từ rất xa.',
            after_fullmoon: 'Chờ qua rằm mới tiến quân tuy quân sĩ no nê dưỡng sức, song khí thế thần tốc ngút trời đã nguội lạnh, giặc đã kịp đắp xong tầng tầng lớp lớp chiến lũy kiên cố.'
          },
          shield: {
            wet_straw_shields: 'Sáng kiến khiên rơm ướt từ chính rơm rạ đồng quê Đại Việt đã biến súng đạn tối tân của giặc thành đồ phế thải. Trí tuệ dân gian muôn đời là vũ khí sắc bén nhất!',
            standard_wood_shields: 'Khiên gỗ bọc da nhẹ nhàng cơ động, song trước đạn gang đỏ lửa và hỏa cầu tẩm dầu, khiên bắt lửa biến hàng quân thành biển lửa.',
            dispersed_rush: 'Chạy tản mát né tránh pháo kích rất dũng cảm, nhưng khi không có hỏa lực che chắn tập trung, dũng sĩ dễ bị chông sắt và tên độc ghìm chặt dưới chân thành.'
          },
          elephants: {
            elephants_vanguard: 'Tượng binh voi chiến chính là "xe bọc thép" thời cổ. Trẫm dùng voi mở đường để san phẳng mọi bãi chông, dẫm nát phòng tuyến sắt đá của địch.',
            elephants_reserve: 'Để voi lại phía sau làm lực lượng dự bị là quá cẩn trọng, khiến bộ binh phải lấy thân mình mở đường máu qua hào chông đẫm máu.',
            cavalry_instead: 'Ngựa chiến nhanh nhẹn nhưng ngửi thấy mùi thuốc súng và hỏa hổ thì hoảng loạn giẫm đạp lên nhau, không thể ủi đổ bờ lũy đất kiên cố như voi chiến.'
          }
        },
        encouragingConclusion: 'Thắng bại trong mô phỏng chính là bài học để rèn giũa nhãn quan chiến lược. Đất nước mai sau trông chờ vào trí tuệ mưu lược và ý chí tự cường của thế hệ các con!'
      }
    },
    {
      id: 'rach-gam-xoai-mut-1785',
      title: 'Trận Thủy Chiến Rạch Gầm - Xoài Mút (1785)',
      subtitle: 'Nguyễn Huệ đại phá 5 vạn quân Xiêm trên sông Tiền',
      commander: 'Long Nhương Tướng quân Nguyễn Huệ',
      opponent: '5 vạn quân thủy bộ Xiêm La (Chiêu Tăng, Chiêu Sương)',
      year: 'Tháng 1 năm 1785',
      teacher: 'Thầy Nguyễn Văn Hưng',
      class: 'Lớp 11A1',
      date: '2026-10-20', // Past date -> Published
      subject: 'Lịch sử',
      grade: 'Khối 11',
      period: 'Tiết 1 · 07:15 - 08:00 (45 phút)',
      objectives: 'Phân tích nghệ thuật nghi binh thủy chiến, lợi dụng dòng chảy thủy triều sông Tiền và đòn hỏa công tiêu diệt hạm đội 300 chiến thuyền giặc.',
      focusQuestion: 'Tại sao Nguyễn Huệ chọn đoạn sông Rạch Gầm - Xoài Mút để lập trận địa mai phục quyết chiến chiến lược?',
      status: 'Đã dạy',
      isPilot: false,
      disclaimer: 'Nội dung minh họa, chưa được chuyên gia duyệt',
      simulationDisclaimer: 'ĐÂY LÀ MÔ PHỎNG DỰA TRÊN Ý KIẾN CỦA HỌC SINH VÀ SỰ KIỆN THỰC TẾ, KHÔNG PHẢI SỰ THẬT LỊCH SỬ.',
      introSummary: 'Năm 1785, quân Xiêm xâm lược miền Nam nước ta. Nguyễn Huệ đưa thủy quân thần tốc vào Mỹ Tho, chọn đoạn sông hiểm trở giữa hai con rạch nhỏ lập trận địa mai phục, lợi dụng con nước ròng đánh tan tác 5 vạn quân giặc chỉ trong một ngày.',
      sections: [
        {
          id: 'rg-1',
          title: 'Khảo sát địa hình và chuẩn bị trận địa mai phục',
          narration: 'Nguyễn Huệ bí mật khảo sát đoạn sông Tiền từ Rạch Gầm đến Xoài Mút: lòng sông rộng, hai bên có lau sậy rậm rạp và cù lao Thới Sơn chắn giữa dòng.',
          caption: 'Bố trí đại bác trên bờ và chiến thuyền giấu kín trong các nhánh rạch rậm rạp.',
          timelineRange: 0.2,
          timeLabel: 'Đêm 18 rạng 19/01/1785',
          source: {
            book: 'Đại Nam thực lục',
            chapter: 'Tiền biên',
            quote: 'Nguyễn Huệ thấy địa thế hiểm yếu, liền ngầm đặt thủy binh hai bên rạch, phục súng lớn trên bờ...',
            note: 'Tư liệu lịch sử về nghệ thuật chọn địa hình tác chiến thủy quân.'
          }
        },
        {
          id: 'rg-2',
          title: 'Nghi binh dụ địch vào khúc sông tử địa',
          narration: 'Sáng sớm, thuyền nhẹ Tây Sơn ra khiêu chiến rồi giả vờ thua chạy. Tướng giặc Chiêu Tăng đắc thắng đốc thúc toàn bộ thuyền chiến đuổi theo.',
          caption: 'Thuyền giặc hăm hở lọt trọn vào khúc sông phục kích đúng lúc thủy triều rút mạnh.',
          timelineRange: 0.6,
          timeLabel: 'Sáng ngày 19/01/1785',
          source: {
            book: 'Gia Định thành thông chí',
            chapter: 'Cương vực chí',
            quote: 'Quân Tây Sơn giả thua rút lui, giặc đuổi theo đến Rạch Gầm thì trúng phục binh.',
            note: 'Mưu chước nhử địch bậc thầy của danh tướng Nguyễn Huệ.'
          }
        },
        {
          id: 'rg-3',
          title: 'Hỏa công tổng kích - Hạm đội Xiêm tan tành',
          narration: 'Pháo lệnh nổ vang, đại bác hai bên bờ và các hòn cù lao nhả đạn dữ dội. Thuyền chiến Tây Sơn từ các nhánh rạch lao ra phóng hỏa thiêu rụi hạm đội giặc.',
          caption: "300 chiến thuyền giặc bị thiêu rụi, tàn quân Xiêm 'sợ Tây Sơn như cọp'.",
          timelineRange: 1.0,
          timeLabel: 'Chiều ngày 19/01/1785',
          source: {
            book: 'Đại Nam chính biên liệt truyện',
            chapter: 'Tây Sơn liệt truyện',
            quote: 'Quân Xiêm vỡ trận nhảy xuống sông chết đuối vô kể, Chiêu Tăng dắt tàn quân theo đường bộ trốn về nước.',
            note: 'Trận thủy chiến lẫy lừng bậc nhất Nam Bộ thế kỷ XVIII.'
          }
        }
      ],
      keyNotes: [
        'Trận Rạch Gầm - Xoài Mút là một trong những trận thủy chiến tiêu diệt chiến thuyền lớn nhất lịch sử chống ngoại xâm.',
        'Nghệ thuật triệt để khai thác quy luật thủy triều sông Tiền kết hợp hỏa khí cơ động.',
        'Chiến thắng đập tan hoàn toàn mưu đồ can thiệp của triều đình Xiêm La đối với miền Nam nước ta.'
      ],
      privateNotes: 'Sổ tay sư phạm: Cho học sinh so sánh điểm giống và khác nhau giữa trận Rạch Gầm - Xoài Mút (1785) và trận Bạch Đằng (1288).',
      questions: [
        {
          id: 'rg-q1',
          text: 'Nguyễn Huệ đã triệt để lợi dụng quy luật tự nhiên nào của dòng sông Tiền để tiêu diệt hạm đội thuyền Xiêm?',
          type: 'multiple_choice',
          sectionId: 'rg-2',
          isEmperorQuestion: false,
          isExplanationReleased: true,
          options: [
            { id: 'rg-opt-1', text: 'Con nước ròng rút nhanh khiến thuyền giặc bị mắc cạn và dồn ứ', isCorrect: true, explanation: 'Thủy triều rút mạnh làm thuyền lớn quân Xiêm khó quay đầu, tạo điều kiện cho thuyền hỏa công Tây Sơn xuôi dòng tập kích.' },
            { id: 'rg-opt-2', text: 'Sương mù dày đặc làm thuyền giặc đâm vào nhau', isCorrect: false, explanation: 'Sông Tiền ban ngày tầm nhìn thoáng đãng.' }
          ]
        }
      ],
      baseline: { durationHours: 24, casualties: 900, positionScore: 92, ratingText: 'Toàn thắng thủy chiến' },
      simulation: {
        propsConfig: { palisade: false, tents: true, elephants: false, banners: true, fire: true, village: true, bamboo: true, river: true },
        unitCounts: { taySonInfantry: 40, taySonElephants: 0, qingInfantry: 45, qingCannons: 8 },
        factionColors: { taySon: '#962d22', qing: '#15803d' },
        cameraPresets: {
          overview: { pos: [0, 80, 110], target: [0, 5, 0] },
          follow_troops: { pos: [-20, 25, 40], target: [0, 5, 0] },
          close_up: { pos: [10, 12, 15], target: [12, 5, 5] },
          top_down: { pos: [0, 110, 0], target: [0, 0, 0] }
        },
        keyframes: [{ time: 0, preset: 'overview' }, { time: 0.5, preset: 'follow_troops' }, { time: 1.0, preset: 'overview' }]
      },
      question: {
        character: { name: 'Long Nhương Tướng quân Nguyễn Huệ', dynasty: 'Tây Sơn', greeting: 'Hỡi ba quân!', speech: 'Nếu địch không đuổi theo vào đoạn sông hiểm trở, các ngươi sẽ làm gì?' },
        variables: []
      }
    },
    {
      id: 'chi-lang-xuong-giang-1427',
      title: 'Chiến Dịch Chi Lăng - Xương Giang (1427)',
      subtitle: 'Khởi nghĩa Lam Sơn chém Liễu Thăng, đập tan 10 vạn viện binh Minh',
      commander: 'Bình Định Vương Lê Lợi & Quân sư Nguyễn Trãi',
      opponent: '10 vạn viện binh Minh (Liễu Thăng, Mộc Thạnh, Lương Minh)',
      year: 'Mùa thu năm 1427',
      teacher: 'Thầy Nguyễn Văn Hưng',
      class: 'Lớp 11A1',
      date: '2026-10-30', // Future date -> SCHEDULED -> HIDDEN from students
      subject: 'Lịch sử',
      grade: 'Khối 11',
      period: 'Tiết 3 · 09:15 - 10:00 (45 phút)',
      objectives: 'Phân tích chiến thuật "vây thành diệt viện", tài thao lược quân sự của Lê Lợi và Nguyễn Trãi tại cửa ải Chi Lăng.',
      focusQuestion: 'Tại sao nghĩa quân Lam Sơn chủ trương tiêu diệt Liễu Thăng ở Chi Lăng trước khi hạ thành Đông Quan?',
      status: 'Đã lên lịch', // Hidden from students!
      isPilot: false,
      disclaimer: 'Nội dung minh họa, chưa được chuyên gia duyệt',
      simulationDisclaimer: 'ĐÂY LÀ MÔ PHỎNG DỰA TRÊN Ý KIẾN CỦA HỌC SINH VÀ SỰ KIỆN THỰC TẾ.',
      introSummary: 'Mùa thu 1427, 15 vạn viện binh nhà Minh chia làm hai đạo ồ ạt kéo sang. Bộ chỉ huy nghĩa quân Lam Sơn quyết định tập trung lực lượng bẻ gãy đạo quân Liễu Thăng tại thung lũng hiểm trở Chi Lăng.',
      sections: [
        {
          id: 'cl-1',
          title: 'Trận phục kích chém Liễu Thăng tại núi Mã Yên',
          narration: 'Tướng Trần Lựu giả vờ thua liên tiếp để nhử Liễu Thăng vào đầm lầy Mã Yên. Khi ngựa Liễu Thăng sa lầy, phục binh Lam Sơn nhất tề xông ra chém đầu chủ tướng giặc.',
          caption: 'Chém Liễu Thăng tại gò Mã Yên, làm rung chuyển tinh thần 10 vạn viện binh Minh.',
          timelineRange: 0.4,
          timeLabel: 'Ngày 18/09 năm Đinh Mùi (1427)',
          source: { book: 'Đại Việt sử ký toàn thư', chapter: 'Bản kỷ thực lục', quote: 'Liễu Thăng dẫn quân đuổi theo, đến núi Mã Yên sa vào bãi lầy... phục binh đâm chết Thăng.' }
        }
      ],
      keyNotes: ['Chiến thuật vây thành diệt viện mẫu mực trong nghệ thuật quân sự Việt Nam.'],
      privateNotes: 'Tài liệu mật dành cho giáo viên soạn bài.',
      questions: [],
      baseline: { durationHours: 48, casualties: 2100, positionScore: 94, ratingText: 'Đại thắng Lam Sơn' },
      simulation: {
        propsConfig: { palisade: true, tents: true, elephants: true, banners: true, fire: true, village: true, bamboo: true, river: true },
        unitCounts: { taySonInfantry: 45, taySonElephants: 4, qingInfantry: 50, qingCannons: 4 },
        factionColors: { taySon: '#b91c1c', qing: '#334155' },
        cameraPresets: {
          overview: { pos: [0, 75, 110], target: [0, 5, 0] },
          follow_troops: { pos: [-20, 20, 40], target: [0, 5, 0] },
          close_up: { pos: [10, 10, 15], target: [10, 5, 0] },
          top_down: { pos: [0, 100, 0], target: [0, 0, 0] }
        },
        keyframes: [{ time: 0, preset: 'overview' }, { time: 1, preset: 'overview' }]
      },
      question: { character: { name: 'Bình Định Vương Lê Lợi' }, variables: [] }
    },
    {
      id: 'khang-chien-mong-nguyen-vuon-khong',
      title: 'Kế Sách Vườn Không Nhà Trống - Ba Lần Kháng Chiến Chống Mông Nguyên',
      subtitle: 'Nghệ thuật tiêu hao sinh lực địch và toàn dân đánh giặc thời nhà Trần',
      commander: 'Quốc công Tiết chế Trần Hưng Đạo',
      opponent: 'Đại quân Mông Cổ và Thoát Hoan',
      year: 'Thế kỷ XIII (1258 - 1285 - 1288)',
      teacher: 'Thầy Nguyễn Văn Hưng',
      class: 'Lớp 11A1',
      date: '2026-11-05', // Future date -> DRAFT -> HIDDEN from students
      subject: 'Lịch sử',
      grade: 'Khối 11',
      period: 'Tiết 1 · 07:15 - 08:00 (45 phút)',
      objectives: 'Phân tích nghệ thuật "lấy đoản binh chế trường trận", sơ tán triệt để kinh thành tạo thế chủ động phản công.',
      focusQuestion: 'Tại sao việc thực hiện "vườn không nhà trống" lại bẻ gãy kỵ binh bách chiến bách thắng của đế chế Mông Cổ?',
      status: 'Nháp', // DRAFT -> HIDDEN from students!
      isPilot: false,
      disclaimer: 'Nội dung minh họa, chưa được chuyên gia duyệt',
      simulationDisclaimer: 'ĐÂY LÀ MÔ PHỎNG DỰA TRÊN Ý KIẾN CỦA HỌC SINH.',
      introSummary: 'Kế sách rút lui chiến lược bỏ lại kinh thành rỗng không khiến đạo kỵ binh viễn chinh Mông Cổ đói khát, hoang mang, rơi vào thế tiến thoái lưỡng nan trước khi quân dân nhà Trần mở cuộc phản công thần sầu.',
      sections: [],
      keyNotes: ['Bài học đoàn kết "vua tôi đồng lòng, anh em hòa thuận, cả nước góp sức".'],
      privateNotes: 'Đang soạn thảo đề cương bài giảng và kịch bản 3D.',
      questions: [],
      baseline: { durationHours: 72, casualties: 1500, positionScore: 90, ratingText: 'Chiến lược toàn dân' },
      simulation: {
        propsConfig: { palisade: true, tents: true, elephants: true, banners: true, fire: true, village: true, bamboo: true, river: true },
        unitCounts: { taySonInfantry: 40, taySonElephants: 2, qingInfantry: 40, qingCannons: 2 },
        factionColors: { taySon: '#854d0e', qing: '#0f172a' },
        cameraPresets: {
          overview: { pos: [0, 75, 110], target: [0, 5, 0] },
          follow_troops: { pos: [-20, 20, 40], target: [0, 5, 0] },
          close_up: { pos: [10, 10, 15], target: [10, 5, 0] },
          top_down: { pos: [0, 100, 0], target: [0, 0, 0] }
        },
        keyframes: [{ time: 0, preset: 'overview' }, { time: 1, preset: 'overview' }]
      },
      question: { character: { name: 'Trần Hưng Đạo' }, variables: [] }
    }
  ];

  window.SEED_LESSONS = SEED_LESSONS;
  window.LESSON_FALLBACK_DATA = SEED_LESSONS[0]; // Compatibility fallback
})(window);

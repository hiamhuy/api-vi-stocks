const { InvestmentProject } = require('../src/models');

const seedInvestments = async () => {
  const projects = [
    {
      name: 'Manhattan Skyline Penthouse',
      location: 'New York, USA',
      description: 'Căn hộ Penthouse đẳng cấp tại trung tâm Manhattan với tầm nhìn toàn cảnh 360 độ ra đường chân trời New York. Dự án bao gồm các tiện ích 6 sao, bể bơi vô cực và hệ thống quản lý thông minh.',
      image: '/uploads/investment/re_ny.png',
      minInvest: 5000,
      maxInvest: 500000,
      cycleDays: 60,
      roiPercentage: 15.00,
      progress: 65,
      isActive: true
    },
    {
      name: 'Palm Jumeirah Oasis Villa',
      location: 'Dubai, UAE',
      description: 'Biệt thự nghỉ dưỡng siêu sang tọa lạc tại nhánh cọ của đảo nhân tạo Palm Jumeirah. Thiết kế hiện đại kết hợp kiến trúc phong cách Ả Rập, bãi biển riêng và bến du thuyền cá nhân.',
      image: '/uploads/investment/re_dubai.png',
      minInvest: 10000,
      maxInvest: 1000000,
      cycleDays: 90,
      roiPercentage: 20.00,
      progress: 42,
      isActive: true
    },
    {
      name: 'Kensington Royal Mansion',
      location: 'London, UK',
      description: 'Tòa lâu đài cổ kính được phục hồi hoàn hảo tại khu vực đắt đỏ nhất London. Kết hợp giữa nét lịch sử Victoria và sự tiện nghi hiện đại bậc nhất thế giới.',
      image: '/uploads/investment/re_london.png',
      minInvest: 8000,
      maxInvest: 800000,
      cycleDays: 120,
      roiPercentage: 25.00,
      progress: 30,
      isActive: true
    },
    {
      name: 'Champs-Élysées Heritage Apartment',
      location: 'Paris, France',
      description: 'Căn hộ di sản nằm ngay đại lộ Champs-Élysées với ban công nhìn thẳng ra tháp Eiffel. Biểu tượng của sự lãng mạn và đẳng cấp thượng lưu Pháp.',
      image: '/uploads/investment/re_paris.png',
      minInvest: 3000,
      maxInvest: 300000,
      cycleDays: 45,
      roiPercentage: 12.00,
      progress: 88,
      isActive: true
    },
    {
      name: 'Shinjuku Vertigo Tower',
      location: 'Tokyo, Japan',
      description: 'Tòa tháp hỗn hợp thương mại và căn hộ cao cấp tại trung tâm Shinjuku. Ứng dụng công nghệ kháng chấn tiên tiến nhất và hệ thống xanh lọc không khí toàn tòa nhà.',
      image: '/uploads/investment/re_tokyo.png',
      minInvest: 2000,
      maxInvest: 200000,
      cycleDays: 30,
      roiPercentage: 8.50,
      progress: 95,
      isActive: true
    },
    {
      name: 'Marina Bay Sands Elite Residence',
      location: 'Singapore',
      description: 'Khu căn hộ phức hợp kề bên Marina Bay Sands. Không gian sống xanh với các vườn treo thẳng đứng và kết nối giao thông hoàn hảo đến trung tâm tài chính.',
      image: '/uploads/investment/re_singapore.png',
      minInvest: 7000,
      maxInvest: 700000,
      cycleDays: 75,
      roiPercentage: 18.00,
      progress: 58,
      isActive: true
    },
    {
      name: 'Platinum Hills Estate',
      location: 'Beverly Hills, USA',
      description: 'Bất động sản rộng lớn tại đồi Beverly Hills, nơi quy tụ của các ngôi sao hàng đầu thế giới. Hồ bơi tràn bờ, rạp chiếu phim tại gia và hệ thống an ninh đa lớp.',
      image: '/uploads/investment/re_bh.png',
      minInvest: 15000,
      maxInvest: 2000000,
      cycleDays: 180,
      roiPercentage: 35.00,
      progress: 22,
      isActive: true
    },
    {
      name: 'Sydney Opera Vista Harbor',
      location: 'Sydney, Australia',
      description: 'Căn hộ mặt nước sở hữu tầm nhìn trực diện ra Nhà hát Opera Sydney và Cầu Cảng. Trải nghiệm bến thuyền ngay dưới thềm nhà và gió biển trong lành mỗi ngày.',
      image: '/uploads/investment/re_sydney.png',
      minInvest: 4000,
      maxInvest: 400000,
      cycleDays: 60,
      roiPercentage: 14.00,
      progress: 72,
      isActive: true
    }
  ];

  try {
    console.log('--- Đang khởi tạo dữ liệu dự án đầu tư ---');
    await InvestmentProject.bulkCreate(projects);
    console.log('✅ Đã tạo thành công 8 dự án bất động sản toàn cầu.');
  } catch (error) {
    console.error('❌ Lỗi khi seed dữ liệu đầu tư:', error);
  }
};

module.exports = seedInvestments;

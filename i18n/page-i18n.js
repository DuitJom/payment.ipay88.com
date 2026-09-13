/* DuitJom page-level localization.
 * This keeps the existing HTML structure intact while translating the
 * standalone information pages and the legacy features partial in place.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "duitjom_locale";
  var supported = { en: true, zh: true };
  var nodeSources = new WeakMap();

  function entry(source, en, zh) {
    return { source: source, en: en, zh: zh };
  }

  var common = [
    entry("DuitJom", "DuitJom", "DuitJom"),
    entry("About Us", "About Us", "关于我们"),
    entry("Privacy", "Privacy", "隐私"),
    entry("Contact Us", "Contact Us", "联系我们"),
    entry("Term & Conditions", "Terms & Conditions", "条款与条件"),
    entry("Apply Loan", "Apply for a Loan", "申请贷款"),
    entry("Kembali", "Back", "返回"),
    entry("← Kembali ke DuitJom", "← Back to DuitJom", "← 返回 DuitJom"),
    entry("Kembali ke DUiTjOM", "Back to DuitJom", "返回 DuitJom"),
    entry("Navigation", "Navigation", "导航"),
    entry("Menu Utama", "Main Menu", "主菜单"),
    entry("Live", "Live", "在线"),
    entry("LIVE", "LIVE", "在线"),
    entry("© 2026 DuitJom. Hak cipta terpelihara.", "© 2026 DuitJom. All rights reserved.", "© 2026 DuitJom。版权所有。"),
    entry("Terms", "Terms", "条款")
  ];

  var home = [
    entry("Dapatkan informasi, berita, panduan dan kemas kini terkini daripada DuitJom dalam satu platform eksklusif dan mewah.", "Get DuitJom information, news, guides and the latest updates in one exclusive platform.", "在一个专属平台上获取 DuitJom 的信息、新闻、指南和最新动态。"),
    entry("Kelebihan Kami", "Our Advantages", "我们的优势"),
    entry("Kenapa DuitJom?", "Why DuitJom?", "为什么选择 DuitJom？"),
    entry("Pantas Kilat", "Lightning Fast", "闪电般快速"),
    entry("Dapatkan kelulusan dalam masa 5 minit sahaja dengan sistem penilaian bertenaga AI kami. Tiada lagi menunggu berhari-hari untuk kelulusan pinjaman.", "Get an answer in as little as 5 minutes with our AI-powered assessment system. No more waiting days for a decision.", "借助人工智能评估系统，最快 5 分钟即可获得结果，无需再等待数天。"),
    entry("5min MASA KELULUSAN", "5 MIN APPROVAL TIME", "5分钟处理时间"),
    entry("24/7 TERSEDIA", "AVAILABLE 24/7", "全天候服务"),
    entry("Permohonan Mudah", "Easy Application", "申请简便"),
    entry("Hanya MyKad dan nombor telefon anda - itu sahaja yang anda perlukan. Proses yang diperkemas kami menghapuskan kertas kerja yang tidak perlu.", "Your MyKad and phone number are all you need. Our streamlined process removes unnecessary paperwork.", "只需身份证和电话号码即可。精简流程省去不必要的文书工作。"),
    entry("Hanya MyKad diperlukan", "MyKad Only", "仅需身份证"),
    entry("Tiada dokumen pendapatan", "No Income Documents", "无需收入文件"),
    entry("Keselamatan Gred Bank", "Bank-Grade Security", "银行级安全保障"),
    entry("Data anda dilindungi dengan 256-bit SSL encryption dan protokol keselamatan canggih yang dipercayai oleh institusi kewangan utama.", "Your data is protected with 256-bit SSL encryption and advanced security protocols trusted by leading financial institutions.", "您的数据受到 256 位 SSL 加密和先进安全协议的保护。"),
    entry("SSL Selamat", "SSL Secured", "SSL 安全加密"),
    entry("Data Dilindungi", "Data Protected", "数据受保护"),
    entry("Ketelusan Penuh", "Full Transparency", "完全透明"),
    entry("Tiada yuran tersembunyi atau caj mengejut. Anda akan tahu dengan tepat apa yang perlu anda bayar sebelum memohon dengan clear fee structure kami.", "No hidden fees or surprise charges. Our clear fee structure shows exactly what you need to pay before applying.", "没有隐藏费用或意外收费。清晰的收费结构让您在申请前了解应付金额。"),
    entry("Untuk Semua Orang", "For Everyone", "适合每一个人"),
    entry("Kriteria kelayakan yang fleksibel bermakna lebih ramai orang boleh mengakses dana yang mereka perlukan, walaupun dengan less-than-perfect credit.", "Flexible eligibility means more people can access the funds they need, even with less-than-perfect credit.", "灵活的资格条件让更多人能够获得所需资金，即使信用记录并不完美。"),
    entry("Umur 20-60", "Age 20–60", "年龄 20–60 岁"),
    entry("Sedang Bekerja", "Currently Employed", "目前在职"),
    entry("Tersedia 24/7", "Available 24/7", "全天候服务"),
    entry("Mohon bila-bila masa, di mana-mana sahaja. Platform kami tidak pernah tidur, jadi anda boleh mendapat bantuan kewangan yang anda perlukan bila-bila masa.", "Apply anytime, anywhere. Our platform is always available when you need financial assistance.", "随时随地申请。平台全天候提供服务，在您需要时为您提供帮助。"),
    entry("Dioptimumkan Mudah Alih", "Mobile Optimized", "移动端优化"),
    entry("Mesra Desktop", "Desktop Friendly", "桌面端友好"),
    entry("Selamat Datang ke DuitJom News", "Welcome to DuitJom News", "欢迎来到 DuitJom 新闻"),
    entry("Ikuti perkembangan terkini, informasi penting dan kemas kini berkaitan pengalaman digital DuitJom.", "Follow the latest developments, important information and updates from the DuitJom digital experience.", "关注 DuitJom 数字体验的最新发展、重要信息和动态。"),
    entry("Baca Sekarang", "Read Now", "立即阅读"),
    entry("Artikel Terkini", "Latest Articles", "最新文章"),
    entry("Kemas Kini Terkini DuitJom", "DuitJom Latest Updates", "DuitJom 最新动态"),
    entry("Ketahui perkembangan dan kemas kini terbaru yang diperkenalkan oleh DuitJom untuk meningkatkan pengalaman pengguna.", "Discover the latest developments and updates introduced by DuitJom to improve the user experience.", "了解 DuitJom 为提升用户体验而推出的最新发展与动态。"),
    entry("Keselamatan Dalam Dunia Digital", "Security in the Digital World", "数字世界中的安全"),
    entry("Beberapa perkara penting yang perlu diketahui pengguna ketika menggunakan perkhidmatan dalam talian.", "Important things users should know when using online services.", "用户使用在线服务时应了解的重要事项。"),
    entry("Tips Menguruskan Kewangan", "Tips for Managing Your Finances", "理财小贴士"),
    entry("Panduan ringkas untuk membantu anda memahami dan menguruskan keperluan kewangan dengan lebih teratur.", "A short guide to help you understand and manage your financial needs in a more organized way.", "一份帮助您更有条理地理解和管理财务需求的简明指南。"),
    entry("Pengalaman Digital DuitJom", "The DuitJom Digital Experience", "DuitJom 数字体验"),
    entry("Kenali ciri-ciri digital yang direka untuk menjadikan pengalaman pengguna lebih mudah dan tersusun.", "Discover digital features designed to make the user experience simpler and more organized.", "了解为让用户体验更简单、更有序而设计的数字功能。"),
    entry("Perkara Penting Untuk Pengguna", "Important Things for Users", "用户须知重要事项"),
    entry("Maklumat dan panduan yang boleh membantu pengguna memahami penggunaan platform digital dengan lebih baik.", "Information and guidance to help users better understand the digital platform.", "帮助用户更好地理解如何使用数字平台的信息与指南。"),
    entry("Kenali DuitJom Dengan Lebih Dekat", "Get to Know DuitJom Better", "更深入了解 DuitJom"),
    entry("Ketahui lebih lanjut mengenai DuitJom, visi kami dan bagaimana kami membina pengalaman digital untuk pengguna.", "Learn more about DuitJom, our vision and how we build digital experiences for users.", "深入了解 DuitJom、我们的愿景以及我们如何为用户打造数字体验。"),
    entry("About Us", "About Us", "关于我们"),
    entry("Read More", "Read More", "阅读更多")
  ];

  var about = [
    entry("About Us - DuitJom", "About Us - DuitJom", "关于我们 - DuitJom"),
    entry("ABOUT DUITJOM", "ABOUT DUITJOM", "关于 DUITJOM"),
    entry("Mengenali", "Meet", "认识"),
    entry("DuitJom dibangunkan dengan matlamat untuk memberikan pengalaman digital yang lebih mudah, moden dan mesra pengguna dalam menguruskan keperluan perkhidmatan kewangan secara dalam talian.", "DuitJom was built to provide a simpler, modern and user-friendly digital experience for managing financial service needs online.", "DuitJom 致力于提供更简单、现代且易于使用的数字体验，帮助用户在线管理金融服务需求。"),
    entry("Siapa Kami?", "Who We Are", "我们是谁？"),
    entry("DuitJom ialah platform digital yang direka untuk memudahkan pengguna mendapatkan maklumat, menguruskan proses dan berinteraksi dengan perkhidmatan yang tersedia melalui pengalaman dalam talian yang ringkas dan intuitif.", "DuitJom is a digital platform designed to help users find information, manage processes and interact with available services through a simple, intuitive online experience.", "DuitJom 是一个数字平台，通过简单直观的在线体验，帮助用户获取信息、管理流程并使用相关服务。"),
    entry("Pengalaman Digital", "Digital Experience", "数字体验"),
    entry("Kami memberikan keutamaan kepada reka bentuk yang mudah digunakan, pantas dan responsif supaya pengguna boleh mengakses platform DuitJom melalui telefon pintar, tablet atau komputer.", "We prioritize an easy-to-use, fast and responsive design so users can access DuitJom on a phone, tablet or computer.", "我们重视易用、快速且响应式的设计，让用户可以通过手机、平板电脑或计算机访问 DuitJom。"),
    entry("Misi Kami", "Our Mission", "我们的使命"),
    entry("Membina pengalaman digital yang lebih mudah, telus dan mesra pengguna dengan menggabungkan teknologi moden, reka bentuk premium dan proses digital yang tersusun.", "To build a simpler, more transparent and user-friendly digital experience by combining modern technology, premium design and organized digital processes.", "结合现代技术、优质设计和有序的数字流程，打造更简单、透明且以用户为中心的数字体验。"),
    entry("Our Principles", "Our Principles", "我们的原则"),
    entry("Nilai Kami", "Our Values", "我们的价值观"),
    entry("Keselamatan", "Security", "安全"),
    entry("Mengutamakan pengalaman digital yang selamat dan bertanggungjawab.", "Prioritizing a safe and responsible digital experience.", "优先提供安全且负责任的数字体验。"),
    entry("Mudah & Pantas", "Simple & Fast", "简单快捷"),
    entry("Proses digital direka supaya lebih ringkas dan mudah difahami.", "Digital processes are designed to be simpler and easier to understand.", "数字流程经过设计，更简单、更易理解。"),
    entry("Pengguna Diutamakan", "Users First", "用户至上"),
    entry("Setiap pengalaman direka dengan keperluan pengguna sebagai keutamaan.", "Every experience is designed around user needs.", "每项体验都以用户需求为优先。"),
    entry("Bersedia Untuk Bermula?", "Ready to Get Started?", "准备开始了吗？"),
    entry("Untuk maklumat lanjut mengenai perkhidmatan DuitJom, sila kunjungi laman web rasmi kami.", "For more information about DuitJom services, please visit our official website.", "如需了解更多 DuitJom 服务信息，请访问我们的官方网站。"),
    entry("Lawati DuitJom", "Visit DuitJom", "访问 DuitJom")
  ];

  var blog = [
    entry("Blog & News - DuitJom", "Blog & News - DuitJom", "博客与新闻 - DuitJom"),
    entry("Gunakan menu ini untuk mengakses halaman utama dan maklumat penting DuitJom dengan lebih mudah.", "Use this menu to access the home page and important DuitJom information.", "使用此菜单轻松访问主页和 DuitJom 重要信息。"),
    entry("DUITJOM BLOG", "DUITJOM BLOG", "DUITJOM 博客"),
    entry("News &", "News &", "新闻与"),
    entry("Updates", "Updates", "动态"),
    entry("Selamat datang ke ruang berita dan informasi DuitJom. Dapatkan kemas kini berkaitan platform, panduan penggunaan, keselamatan digital serta informasi kewangan yang disusun untuk membantu pengguna mendapatkan maklumat dengan lebih jelas dan teratur.", "Welcome to the DuitJom news and information hub. Find platform updates, usage guides, digital safety advice and financial information organized to help users stay informed.", "欢迎来到 DuitJom 新闻与信息中心。这里提供平台动态、使用指南、数字安全建议和金融信息，帮助用户更清晰、有条理地获取资讯。"),
    entry("Featured Update", "Featured Update", "精选动态"),
    entry("Ikuti perkembangan terkini daripada DuitJom melalui ruang berita dan informasi kami. Bahagian ini menyediakan kemas kini mengenai perkembangan platform, informasi penting, panduan penggunaan serta perkara berkaitan pengalaman digital DuitJom.", "Follow the latest developments from DuitJom through our news and information hub, including platform updates, important information, usage guides and digital experience notes.", "通过我们的新闻与信息中心了解 DuitJom 的最新发展，包括平台动态、重要信息、使用指南和数字体验资讯。"),
    entry("Lihat Artikel", "View Articles", "查看文章"),
    entry("Latest News", "Latest News", "最新新闻"),
    entry("Berita & Kemas Kini", "News & Updates", "新闻与动态"),
    entry("Dapatkan perkembangan terbaru berkaitan DuitJom, perubahan platform, ciri digital dan informasi yang penting untuk diketahui oleh pengguna.", "Get the latest DuitJom developments, platform changes, digital features and information users should know.", "了解 DuitJom 的最新发展、平台变化、数字功能和用户须知信息。"),
    entry("Ketahui perkembangan dan kemas kini terbaru yang diperkenalkan oleh DuitJom. Setiap perubahan dan penambahbaikan bertujuan membantu menjadikan pengalaman pengguna lebih tersusun serta memudahkan akses kepada informasi yang diperlukan.", "Discover the latest developments and updates introduced by DuitJom. Each improvement is intended to make the user experience more organized and information easier to access.", "了解 DuitJom 推出的最新发展与动态。每项改进都旨在让用户体验更有条理，并更容易获取所需信息。"),
    entry("Keselamatan maklumat merupakan perkara penting ketika menggunakan perkhidmatan dalam talian. Pengguna digalakkan untuk menjaga maklumat akaun, tidak berkongsi maklumat sulit dengan pihak yang tidak dikenali dan sentiasa menyemak maklumat sebelum membuat sebarang tindakan.", "Information security matters when using online services. Protect your account details, do not share sensitive information with unknown parties and always verify details before taking action.", "使用在线服务时，信息安全十分重要。请保护账户信息，不要向陌生人分享敏感资料，并在操作前核实信息。"),
    entry("DuitJom memberi perhatian kepada pengalaman digital pengguna melalui susunan halaman, navigasi dan informasi yang lebih teratur. Matlamatnya adalah untuk membantu pengguna memahami setiap bahagian platform dengan lebih mudah ketika mendapatkan informasi yang diperlukan.", "DuitJom focuses on a clearer digital experience through organized pages, navigation and information, helping users understand the platform and find what they need.", "DuitJom 通过更有条理的页面、导航和信息，专注于打造清晰的数字体验，帮助用户理解平台并找到所需内容。"),
    entry("Knowledge Centre", "Knowledge Centre", "知识中心"),
    entry("Panduan & Informasi", "Guides & Information", "指南与信息"),
    entry("Koleksi panduan ringkas dan informasi berguna untuk membantu pengguna memahami perkara berkaitan kewangan, penggunaan platform dan keselamatan dalam persekitaran digital.", "A collection of practical guides and useful information about finances, platform use and safety in a digital environment.", "提供实用指南和有用信息，帮助用户了解财务、平台使用和数字环境安全。"),
    entry("Pengurusan kewangan yang teratur boleh membantu seseorang membuat keputusan dengan lebih baik. Antara perkara yang boleh diberi perhatian termasuk menyusun komitmen, memahami kemampuan bayaran, merancang perbelanjaan dan menilai keperluan sebelum membuat keputusan.", "Organized financial planning can support better decisions. Consider your commitments, repayment capacity, spending plan and needs before deciding.", "有条理的财务管理有助于做出更好的决定。做决定前，请整理承诺、了解还款能力、规划支出并评估需求。"),
    entry("Sebelum menggunakan mana-mana perkhidmatan digital, pengguna digalakkan membaca informasi yang disediakan, memahami terma yang ditetapkan dan memastikan maklumat yang diberikan adalah tepat. Memahami maklumat terlebih dahulu dapat membantu mengurangkan kekeliruan sepanjang proses.", "Before using a digital service, read the information provided, understand the terms and make sure your details are accurate. Understanding the information first can reduce confusion throughout the process.", "使用任何数字服务前，请阅读相关信息、了解条款并确保所提供资料准确。先了解信息有助于减少流程中的疑惑。"),
    entry("Ketahui lebih lanjut mengenai DuitJom, pendekatan kami terhadap pengalaman digital dan bagaimana informasi disusun untuk membantu pengguna mendapatkan akses kepada halaman, informasi dan perkhidmatan yang berkaitan dengan lebih mudah dan teratur.", "Learn more about DuitJom, our approach to digital experiences and how information is organized to make relevant pages, information and services easier to access.", "进一步了解 DuitJom、我们对数字体验的理念，以及我们如何整理信息，让用户更轻松、有条理地访问相关页面、资讯和服务。"),
    entry("Mahu Ketahui Lebih Lanjut?", "Want to Learn More?", "想了解更多？"),
    entry("Untuk mendapatkan maklumat lanjut mengenai DuitJom, ciri-ciri platform serta informasi yang tersedia, sila kunjungi laman web rasmi kami. Anda juga boleh menggunakan menu navigasi di bahagian atas untuk mendapatkan akses kepada halaman penting DuitJom.", "For more information about DuitJom, platform features and available resources, visit our official website or use the navigation menu above to access important pages.", "如需了解更多 DuitJom、平台功能和可用资源，请访问官方网站，或使用上方导航菜单访问重要页面。"),
    entry("Visit Official Website", "Visit Official Website", "访问官方网站")
  ];

  var privacy = [
    entry("Privacy Policy - DuitJom", "Privacy Policy - DuitJom", "隐私政策 - DuitJom"),
    entry("Privacy Policy DuitJom", "DuitJom Privacy Policy", "DuitJom 隐私政策"),
    entry("Tarikh kemas kini terakhir: 31 Julai 2026", "Last updated: 31 July 2026", "最后更新：2026年7月31日"),
    entry("DuitJom menghormati privasi pengguna dan komited untuk melindungi maklumat peribadi yang diberikan semasa menggunakan website dan perkhidmatan kami.", "DuitJom respects user privacy and is committed to protecting personal information provided while using our website and services.", "DuitJom 尊重用户隐私，并致力于保护您使用我们网站和服务时提供的个人信息。"),
    entry("Keamanan Data", "Data Security", "数据安全"),
    entry("Kami melindungi maklumat anda dengan enkripsi dan protokol keselamatan terkini.", "We protect your information with encryption and current security protocols.", "我们使用加密和最新安全协议保护您的信息。"),
    entry("Prioriti Utama", "Top Priority", "首要任务"),
    entry("Privasi Peribadi", "Personal Privacy", "个人隐私"),
    entry("Maklumat peribadi anda tidak akan dijual atau dibongkar kepada pihak ketiga tanpa kebenaran.", "Your personal information will not be sold or disclosed to third parties without permission.", "未经许可，我们不会出售或向第三方披露您的个人信息。"),
    entry("Terlindung", "Protected", "受到保护"),
    entry("Kawalan Penuh", "Full Control", "完全控制"),
    entry("Anda mempunyai kawalan penuh terhadap data anda dan boleh meminta pemadaman bila-bila masa.", "You have control over your data and may request deletion at any time.", "您可以控制自己的数据，并可随时提出删除请求。"),
    entry("Hak Anda", "Your Rights", "您的权利"),
    entry("Sokongan 24/7", "24/7 Support", "全天候支持"),
    entry("Hubungi pasukan sokongan kami jika ada pertanyaan berkaitan privasi dan data anda.", "Contact our support team with questions about your privacy and data.", "如对隐私和数据有疑问，请联系我们的支持团队。"),
    entry("Sedia Membantu", "Here to Help", "随时为您提供帮助"),
    entry("1. Maklumat Yang Kami Kumpul", "1. Information We Collect", "1. 我们收集的信息"),
    entry("Kami mungkin mengumpul maklumat yang diberikan oleh pengguna termasuk:", "We may collect information provided by users, including:", "我们可能收集用户提供的信息，包括："),
    entry("Nama pengguna", "User name", "用户名"),
    entry("Alamat e-mel", "Email address", "电子邮件地址"),
    entry("Maklumat akaun yang diberikan melalui log masuk pihak ketiga seperti Google Login, GitHub Login atau perkhidmatan berkaitan", "Account information provided through third-party sign-in such as Google Login, GitHub Login or related services", "通过 Google Login、GitHub Login 或相关服务等第三方登录提供的账户信息"),
    entry("Maklumat yang dihantar melalui borang atau komunikasi dengan pihak kami", "Information submitted through forms or communications with us", "通过表格或与我们的沟通提交的信息"),
    entry("2. Penggunaan Maklumat", "2. How We Use Information", "2. 信息的使用"),
    entry("Maklumat pengguna digunakan untuk:", "User information is used to:", "用户信息用于："),
    entry("Menyediakan dan mengurus akses pengguna ke perkhidmatan DuitJom", "Provide and manage user access to DuitJom services", "提供和管理用户对 DuitJom 服务的访问"),
    entry("Mengesahkan identiti pengguna", "Verify user identity", "验证用户身份"),
    entry("Meningkatkan keselamatan dan pengalaman pengguna", "Improve security and user experience", "提升安全性和用户体验"),
    entry("Menghubungi pengguna berkaitan perkhidmatan kami", "Contact users about our services", "就我们的服务联系用户"),
    entry("3. Log Masuk Pihak Ketiga", "3. Third-Party Sign-In", "3. 第三方登录"),
    entry("Jika pengguna memilih untuk menggunakan Google Login atau GitHub Login, kami mungkin menerima maklumat asas yang dibenarkan oleh pengguna melalui perkhidmatan tersebut seperti nama dan alamat e-mel.", "If a user chooses Google Login or GitHub Login, we may receive basic information authorized through those services, such as a name and email address.", "如果用户选择 Google 登录或 GitHub 登录，我们可能会通过这些服务接收用户授权的基本信息，例如姓名和电子邮件地址。"),
    entry("Kami hanya menggunakan maklumat tersebut untuk tujuan pengesahan akaun dan penyediaan perkhidmatan.", "We use that information only for account verification and service delivery.", "我们仅将这些信息用于账户验证和提供服务。"),
    entry("4. Perlindungan Maklumat", "4. Information Protection", "4. 信息保护"),
    entry("Kami mengambil langkah keselamatan yang munasabah untuk melindungi maklumat pengguna daripada akses yang tidak dibenarkan, kehilangan atau penyalahgunaan.", "We take reasonable security measures to protect user information from unauthorized access, loss or misuse.", "我们采取合理的安全措施，保护用户信息免遭未经授权的访问、丢失或滥用。"),
    entry("5. Perkongsian Maklumat", "5. Information Sharing", "5. 信息共享"),
    entry("Kami tidak menjual atau menyewakan maklumat peribadi pengguna kepada pihak ketiga. Maklumat hanya digunakan bagi tujuan penyediaan perkhidmatan atau apabila diperlukan oleh undang-undang.", "We do not sell or rent user personal information to third parties. Information is used only to provide services or when required by law.", "我们不会向第三方出售或出租用户个人信息。信息仅用于提供服务，或在法律要求时使用。"),
    entry("6. Pemadaman Data Pengguna", "6. User Data Deletion", "6. 用户数据删除"),
    entry("Pengguna boleh meminta pemadaman data mereka dengan menghubungi pihak sokongan kami. Sila rujuk", "Users may request deletion of their data by contacting our support team. Please see", "用户可以联系我们的支持团队来请求删除数据。详情请参阅"),
    entry("halaman Data Deletion", "the Data Deletion page", "数据删除页面"),
    entry("untuk maklumat lanjut.", "for more information.", "了解更多信息。"),
    entry("7. Perubahan Polisi Privasi", "7. Changes to This Privacy Policy", "7. 隐私政策变更"),
    entry("DuitJom boleh mengemas kini Polisi Privasi ini dari semasa ke semasa. Sebarang perubahan akan dipaparkan pada halaman ini.", "DuitJom may update this Privacy Policy from time to time. Changes will be posted on this page.", "DuitJom 可能会不时更新本隐私政策。任何变更都会发布在本页面。"),
    entry("8. Hubungi Kami", "8. Contact Us", "8. 联系我们"),
    entry("Jika anda mempunyai pertanyaan berkaitan privasi, sila hubungi:", "If you have privacy questions, please contact:", "如对隐私有疑问，请联系："),
    entry("Email:", "Email:", "电子邮件："),
    entry("Terma & Syarat (FAQ)", "Terms & Conditions (FAQ)", "条款与条件（常见问题）"),
    entry("Data Pengguna", "User Data", "用户数据")
  ];

  var deletion = [
    entry("Data Deletion - DuitJom", "Data Deletion - DuitJom", "数据删除 - DuitJom"),
    entry("Data Deletion", "Data Deletion", "数据删除"),
    entry("Kemaskini terakhir:", "Last updated:", "最后更新："),
    entry("20 Ogos 2026", "20 August 2026", "2026年8月20日"),
    entry("Pengguna boleh meminta pemadaman data peribadi yang dikaitkan dengan penggunaan perkhidmatan DuitJom melalui saluran sokongan rasmi.", "Users may request deletion of personal data associated with their use of DuitJom services through official support channels.", "用户可以通过官方支持渠道请求删除与使用 DuitJom 服务相关的个人数据。"),
    entry("1. Cara Membuat Permintaan", "1. How to Make a Request", "1. 如何提出请求"),
    entry("Hantar permintaan pemadaman data kepada", "Send a data deletion request to", "请将数据删除请求发送至"),
    entry("menggunakan alamat e-mel yang berkaitan dengan akaun anda. Sila nyatakan nama penuh dan maklumat pengenalan yang diperlukan supaya kami boleh mengesahkan permintaan tersebut dengan selamat. Jangan hantar kata laluan, kod pengesahan atau maklumat pembayaran penuh melalui e-mel.", "Use the email address associated with your account. Include your full name and the identification details needed to verify the request securely. Do not send passwords, verification codes or full payment details by email.", "请使用与账户关联的电子邮件地址。提供全名和必要的身份信息，以便我们安全核实请求。请勿通过电子邮件发送密码、验证码或完整付款信息。"),
    entry("2. Proses Pengesahan", "2. Verification Process", "2. 验证流程"),
    entry("Pasukan sokongan mungkin meminta maklumat tambahan yang munasabah untuk mengesahkan identiti pemohon dan mengelakkan pemadaman yang tidak dibenarkan. Permintaan yang tidak dapat disahkan mungkin memerlukan maklumat lanjut sebelum diproses.", "Our support team may request reasonable additional information to verify the requester and prevent unauthorized deletion. Requests that cannot be verified may require more information before processing.", "我们的支持团队可能会要求合理的补充信息，以验证申请人身份并防止未经授权的删除。无法验证的请求可能需要提供更多信息后才能处理。"),
    entry("3. Skop Pemadaman", "3. Deletion Scope", "3. 删除范围"),
    entry("Selepas permintaan diluluskan, data peribadi yang tidak lagi diperlukan untuk tujuan perkhidmatan akan dipadam atau dinyahkenal pasti, tertakluk kepada keperluan undang-undang, keselamatan, pencegahan penipuan, rekod transaksi dan penyelesaian pertikaian.", "After approval, personal data no longer needed for service purposes will be deleted or de-identified, subject to legal, security, fraud-prevention, transaction-record and dispute-resolution requirements.", "请求获批准后，不再需要用于服务目的的个人数据将被删除或去标识化，但须遵守法律、安全、反欺诈、交易记录和争议解决要求。"),
    entry("4. Tempoh Pemprosesan", "4. Processing Time", "4. 处理时间"),
    entry("Kami akan menyemak permintaan dalam tempoh yang munasabah dan memaklumkan pemohon jika terdapat maklumat tambahan yang diperlukan. Sesetengah rekod mungkin perlu disimpan untuk tempoh tertentu apabila diwajibkan oleh undang-undang atau diperlukan bagi tujuan pematuhan.", "We will review requests within a reasonable period and notify the requester if additional information is needed. Some records may need to be retained for a period when required by law or compliance obligations.", "我们会在合理期限内审核请求，如需补充信息会通知申请人。法律或合规要求可能规定部分记录必须保留一段时间。"),
    entry("5. Hubungi Kami", "5. Contact Us", "5. 联系我们"),
    entry("Untuk pertanyaan berkaitan pemadaman data, sila hubungi:", "For questions about data deletion, please contact:", "如对数据删除有疑问，请联系："),
    entry("Lihat Polisi Privasi", "View Privacy Policy", "查看隐私政策"),
    entry("Laman Utama", "Home", "主页"),
    entry("Polisi Privasi", "Privacy Policy", "隐私政策")
  ];

  var terms = [
    entry("Terma & Syarat - DuitJom", "Terms & Conditions - DuitJom", "条款与条件 - DuitJom"),
    entry("DUITJOM TERMS", "DUITJOM TERMS", "DUITJOM 条款"),
    entry("Terma &", "Terms &", "条款与"),
    entry("Syarat", "Conditions", "条件"),
    entry("Halaman ini menerangkan terma, syarat dan garis panduan yang mengawal penggunaan laman web serta kemudahan yang disediakan oleh DuitJom. Sila baca maklumat berikut dengan teliti sebelum meneruskan penggunaan laman web kami.", "This page explains the terms, conditions and guidelines governing use of the DuitJom website and facilities. Please read the information carefully before continuing to use our website.", "本页面说明使用 DuitJom 网站和相关功能时适用的条款、条件和指南。继续使用我们的网站前，请仔细阅读以下信息。"),
    entry("Kemas kini terakhir: 2026", "Last updated: 2026", "最后更新：2026年"),
    entry("Pengenalan", "Introduction", "简介"),
    entry("Selamat datang ke", "Welcome to", "欢迎来到"),
    entry("Dengan mengakses atau menggunakan laman web ini, anda mengakui bahawa anda telah membaca dan memahami terma serta syarat yang dinyatakan. Terma ini diwujudkan bagi menerangkan tanggungjawab pengguna, penggunaan laman web dan perkara berkaitan perkhidmatan yang disediakan melalui platform ini.", "By accessing or using this website, you acknowledge that you have read and understood these terms and conditions. They explain user responsibilities, website use and matters related to services provided through this platform.", "访问或使用本网站即表示您确认已阅读并理解这些条款与条件。条款说明用户责任、网站使用方式以及平台所提供服务的相关事项。"),
    entry("Penerimaan Terma", "Acceptance of Terms", "接受条款"),
    entry("Dengan mengakses, melayari atau menggunakan mana-mana bahagian laman web DuitJom, anda bersetuju untuk mematuhi terma dan syarat yang dinyatakan di halaman ini.", "By accessing, browsing or using any part of the DuitJom website, you agree to comply with the terms and conditions on this page.", "访问、浏览或使用 DuitJom 网站的任何部分，即表示您同意遵守本页面的条款与条件。"),
    entry("Sekiranya anda tidak bersetuju dengan mana-mana bahagian terma ini, anda dinasihatkan supaya tidak meneruskan penggunaan laman web atau kemudahan yang berkaitan.", "If you do not agree with any part of these terms, you should stop using the website and related facilities.", "如果您不同意这些条款的任何部分，请停止使用本网站及相关功能。"),
    entry("Penggunaan Laman Web", "Website Use", "网站使用"),
    entry("Pengguna hendaklah menggunakan laman web DuitJom secara sah, bertanggungjawab dan tidak melakukan sebarang tindakan yang boleh menjejaskan operasi, keselamatan atau pengalaman pengguna lain.", "Users must use the DuitJom website lawfully and responsibly and must not take actions that could affect its operation, security or other users' experience.", "用户必须合法、负责任地使用 DuitJom 网站，不得采取影响网站运行、安全或其他用户体验的行为。"),
    entry("Penggunaan Yang Dibenarkan", "Permitted Use", "允许的使用方式"),
    entry("Memberikan maklumat yang benar, lengkap dan tepat.", "Provide true, complete and accurate information.", "提供真实、完整和准确的信息。"),
    entry("Menggunakan laman web untuk tujuan yang sah.", "Use the website for lawful purposes.", "将网站用于合法目的。"),
    entry("Membaca dan memahami maklumat yang diberikan sebelum membuat keputusan.", "Read and understand the information provided before making a decision.", "做出决定前阅读并理解所提供的信息。"),
    entry("Menggunakan saluran rasmi untuk mendapatkan bantuan.", "Use official channels for assistance.", "通过官方渠道获取帮助。"),
    entry("Aktiviti Yang Dilarang", "Prohibited Activities", "禁止的活动"),
    entry("Cuba mendapatkan akses kepada sistem tanpa kebenaran.", "Attempt to access the system without authorization.", "尝试未经授权访问系统。"),
    entry("Menggunakan maklumat palsu atau mengelirukan.", "Use false or misleading information.", "使用虚假或误导性信息。"),
    entry("Mengganggu atau menyalahgunakan fungsi laman web.", "Disrupt or misuse website functions.", "干扰或滥用网站功能。"),
    entry("Menggunakan platform untuk aktiviti yang melanggar undang-undang.", "Use the platform for unlawful activities.", "将平台用于违法活动。"),
    entry("Maklumat Pengguna", "User Information", "用户信息"),
    entry("Pengguna bertanggungjawab memastikan maklumat yang diberikan kepada DuitJom adalah tepat, lengkap dan terkini. Sebarang perubahan kepada maklumat penting hendaklah dikemas kini melalui saluran yang sesuai apabila diperlukan.", "Users are responsible for ensuring that information provided to DuitJom is accurate, complete and current. Important changes should be updated through the appropriate channel when needed.", "用户有责任确保提供给 DuitJom 的信息准确、完整且为最新信息。重要信息发生变化时，应通过适当渠道更新。"),
    entry("Keselamatan akaun:", "Account security:", "账户安全："),
    entry("Jangan berkongsi kata laluan, PIN, OTP, TAC, kod pengesahan atau maklumat keselamatan lain dengan pihak yang tidak diberi kuasa.", "Do not share passwords, PINs, OTPs, TACs, verification codes or other security information with unauthorized parties.", "不要向未经授权的人员分享密码、PIN、OTP、TAC、验证码或其他安全信息。"),
    entry("Permohonan & Perkhidmatan", "Applications & Services", "申请与服务"),
    entry("Sebarang permohonan yang dihantar melalui DuitJom mungkin tertakluk kepada proses semakan, pengesahan, syarat kelayakan, dokumentasi dan penilaian yang berkaitan.", "Applications submitted through DuitJom may be subject to review, verification, eligibility requirements, documentation and related assessment.", "通过 DuitJom 提交的申请可能需要经过审核、验证、资格要求、文件和相关评估。"),
    entry("Penghantaran permohonan tidak boleh dianggap sebagai jaminan bahawa sesuatu permohonan akan diluluskan. Keputusan akhir adalah tertakluk kepada proses dan kriteria yang berkaitan.", "Submitting an application does not guarantee approval. The final decision is subject to the relevant process and criteria.", "提交申请不代表一定会获批。最终决定取决于相关流程和标准。"),
    entry("Penting:", "Important:", "重要："),
    entry("Pastikan semua maklumat yang dihantar adalah tepat sebelum membuat sebarang permohonan. Jangan menghantar maklumat milik individu lain tanpa kebenaran yang sewajarnya.", "Make sure all submitted information is accurate before applying. Do not submit another person's information without proper permission.", "提交申请前请确保所有信息准确。未经适当许可，不要提交他人的信息。"),
    entry("Bayaran & Tanggungjawab", "Payments & Responsibilities", "付款与责任"),
    entry("Sekiranya terdapat sebarang pembayaran atau komitmen yang berkaitan dengan sesuatu perkhidmatan, pengguna bertanggungjawab memastikan transaksi dibuat berdasarkan arahan rasmi dan maklumat yang telah disahkan.", "For any payment or service commitment, users are responsible for ensuring that transactions follow official instructions and verified information.", "如涉及付款或服务承诺，用户有责任确保交易依据官方指示和已核实的信息进行。"),
    entry("Sebelum melakukan sebarang pembayaran, pengguna hendaklah menyemak jumlah bayaran, penerima, rujukan transaksi dan maklumat lain yang berkaitan.", "Before making a payment, users should verify the amount, recipient, transaction reference and other relevant information.", "付款前，用户应核对付款金额、收款方、交易参考号和其他相关信息。"),
    entry("Keselamatan & Pencegahan Penipuan", "Security & Fraud Prevention", "安全与防诈骗"),
    entry("Keselamatan pengguna merupakan perkara penting ketika menggunakan platform digital. Pengguna hendaklah sentiasa berhati-hati terhadap pihak yang meminta maklumat peribadi, kewangan atau kod keselamatan atas nama DuitJom.", "User safety is important when using a digital platform. Be careful of anyone requesting personal, financial or security-code information on behalf of DuitJom.", "使用数字平台时，用户安全十分重要。请警惕任何以 DuitJom 名义索取个人、财务或安全验证码信息的人。"),
    entry("Panduan Keselamatan", "Security Guidance", "安全指南"),
    entry("Jangan berikan OTP atau TAC kepada sesiapa.", "Never give your OTP or TAC to anyone.", "不要向任何人提供 OTP 或 TAC。"),
    entry("Jangan berkongsi kata laluan atau PIN.", "Do not share your password or PIN.", "不要分享密码或 PIN。"),
    entry("Pastikan anda berada di laman web rasmi sebelum memasukkan maklumat.", "Make sure you are on the official website before entering information.", "输入信息前，请确认您位于官方网站。"),
    entry("Berhati-hati dengan pautan yang diterima melalui mesej atau e-mel yang mencurigakan.", "Be careful with links received in suspicious messages or emails.", "谨慎处理可疑短信或电子邮件中的链接。"),
    entry("Hubungi saluran rasmi sekiranya terdapat aktiviti yang kelihatan mencurigakan.", "Contact an official channel if activity appears suspicious.", "如发现可疑活动，请联系官方渠道。"),
    entry("Harta Intelek", "Intellectual Property", "知识产权"),
    entry("Semua kandungan yang terdapat di laman web DuitJom, termasuk logo, reka bentuk, teks, grafik, susun atur, elemen visual dan bahan lain, mungkin dilindungi oleh hak harta intelek yang berkenaan.", "Content on the DuitJom website, including logos, designs, text, graphics, layouts, visual elements and other materials, may be protected by applicable intellectual property rights.", "DuitJom 网站上的内容，包括标志、设计、文字、图形、布局、视觉元素和其他材料，可能受适用的知识产权保护。"),
    entry("Kandungan tersebut tidak boleh disalin, diterbitkan semula, diubah suai, diedarkan atau digunakan untuk tujuan komersial tanpa kebenaran yang sewajarnya.", "Such content may not be copied, reproduced, modified, distributed or used commercially without proper permission.", "未经适当许可，不得复制、重制、修改、分发或将这些内容用于商业目的。"),
    entry("Ketersediaan Perkhidmatan", "Service Availability", "服务可用性"),
    entry("DuitJom berusaha untuk memastikan laman web tersedia dan berfungsi dengan baik. Walau bagaimanapun, terdapat keadaan tertentu seperti penyelenggaraan, gangguan teknikal, masalah rangkaian atau faktor luar kawalan yang boleh menyebabkan sebahagian fungsi tidak tersedia buat sementara waktu.", "DuitJom works to keep the website available and functioning well. However, maintenance, technical interruptions, network issues or factors beyond our control may temporarily affect some functions.", "DuitJom 致力于保持网站可用并正常运行。但维护、技术中断、网络问题或不可控因素可能导致部分功能暂时不可用。"),
    entry("Pautan Pihak Ketiga", "Third-Party Links", "第三方链接"),
    entry("Laman web mungkin mengandungi pautan ke laman atau perkhidmatan pihak ketiga. Pautan tersebut disediakan sebagai kemudahan kepada pengguna.", "The website may contain links to third-party sites or services. These links are provided for user convenience.", "网站可能包含指向第三方网站或服务的链接。这些链接仅为方便用户而提供。"),
    entry("Pengguna dinasihatkan untuk menyemak polisi, terma dan amalan privasi laman pihak ketiga sebelum memberikan sebarang maklumat atau menggunakan perkhidmatan mereka.", "Users should review the third party's privacy policy, terms and practices before providing information or using its services.", "提供信息或使用第三方服务前，用户应查看其隐私政策、条款和做法。"),
    entry("Perubahan Terma & Syarat", "Changes to Terms & Conditions", "条款与条件变更"),
    entry("DuitJom boleh mengemaskini, mengubah atau menambah baik terma dan syarat ini dari semasa ke semasa bagi mencerminkan perubahan pada operasi, fungsi laman web, perkhidmatan atau keperluan yang berkaitan.", "DuitJom may update, change or improve these terms from time to time to reflect changes to operations, website functions, services or related requirements.", "DuitJom 可能会不时更新、修改或改进这些条款，以反映运营、网站功能、服务或相关要求的变化。"),
    entry("Pengguna digalakkan menyemak halaman ini secara berkala bagi mengetahui versi terma dan syarat yang sedang berkuat kuasa.", "Users are encouraged to review this page regularly to stay informed about the current terms.", "建议用户定期查看本页面，了解当前有效的条款与条件。"),
    entry("Frequently Asked Questions", "Frequently Asked Questions", "常见问题"),
    entry("Soalan Lazim", "Frequently Asked Questions", "常见问题"),
    entry("Apakah DuitJom?", "What is DuitJom?", "什么是 DuitJom？"),
    entry("DuitJom ialah platform dalam talian yang menyediakan maklumat serta kemudahan digital berkaitan perkhidmatan yang tersedia melalui laman web kami.", "DuitJom is an online platform providing information and digital facilities related to services available through our website.", "DuitJom 是一个在线平台，提供与我们网站服务相关的信息和数字功能。"),
    entry("Adakah menghantar permohonan menjamin kelulusan?", "Does submitting an application guarantee approval?", "提交申请是否保证获批？"),
    entry("Tidak. Penghantaran permohonan tidak menjamin kelulusan. Setiap permohonan tertakluk kepada proses semakan dan kriteria yang berkaitan.", "No. Submitting an application does not guarantee approval. Each application is subject to the relevant review process and criteria.", "不保证。提交申请不代表一定获批，每份申请都须经过相关审核流程并符合相应标准。"),
    entry("Apakah maklumat keselamatan yang tidak boleh dikongsi?", "What security information must not be shared?", "哪些安全信息不能分享？"),
    entry("Pengguna tidak sepatutnya berkongsi kata laluan, PIN, OTP, TAC atau kod pengesahan keselamatan kepada pihak lain.", "Users should not share passwords, PINs, OTPs, TACs or security verification codes with anyone else.", "用户不应向他人分享密码、PIN、OTP、TAC 或安全验证码。"),
    entry("Bagaimana saya boleh mendapatkan bantuan?", "How can I get help?", "如何获取帮助？"),
    entry("Anda boleh mendapatkan bantuan dengan menghubungi saluran komunikasi rasmi yang disediakan oleh DuitJom.", "You can get help by contacting the official communication channels provided by DuitJom.", "您可以通过 DuitJom 提供的官方沟通渠道获取帮助。"),
    entry("Adakah terma dan syarat boleh berubah?", "Can the terms and conditions change?", "条款与条件会改变吗？"),
    entry("Ya. Terma dan syarat boleh dikemas kini dari semasa ke semasa. Versi terkini akan dipaparkan di halaman ini.", "Yes. The terms may be updated from time to time. The latest version will be shown on this page.", "会。条款与条件可能会不时更新，最新版本会发布在本页面。"),
    entry("Apa yang perlu dilakukan jika menerima mesej mencurigakan?", "What should I do if I receive a suspicious message?", "收到可疑信息时应该怎么办？"),
    entry("Jangan berikan maklumat peribadi atau kod keselamatan. Semak sumber mesej tersebut dan gunakan saluran rasmi DuitJom untuk mendapatkan pengesahan atau bantuan.", "Do not provide personal information or security codes. Check the message source and use an official DuitJom channel for verification or help.", "不要提供个人信息或安全验证码。请核实信息来源，并通过 DuitJom 官方渠道获取确认或帮助。"),
    entry("Perlukan Bantuan?", "Need Help?", "需要帮助？"),
    entry("Sekiranya anda mempunyai pertanyaan mengenai Terma & Syarat, penggunaan laman web atau perkara berkaitan perkhidmatan DuitJom, sila hubungi kami melalui saluran rasmi.", "If you have questions about the Terms & Conditions, website use or DuitJom services, please contact us through an official channel.", "如对条款与条件、网站使用或 DuitJom 服务有疑问，请通过官方渠道联系我们。"),
    entry("Kembali ke DUiTjOM", "Back to DuitJom", "返回 DuitJom")
  ];

  var maps = { home: home, about: about, blog: blog, privacy: privacy, deletion: deletion, terms: terms };
  var pageNames = {
    "about-us.html": "about",
    "blog.html": "blog",
    "privacy-policy.html": "privacy",
    "data-deletion.html": "deletion",
    "term-conditional.html": "terms"
  };

  function locale() {
    try {
      var stored = window.localStorage.getItem(STORAGE_KEY);
      if (supported[stored]) return stored;
    } catch (error) {}
    return "en";
  }

  function pageKey() {
    var file = window.location.pathname.split("/").pop() || "index.html";
    return pageNames[file] || "home";
  }

  function buildMap(key) {
    var result = {};
    common.concat(maps[key] || []).forEach(function (item) {
      result[item.source] = { en: item.en, zh: item.zh };
    });
    return result;
  }

  function textValue(node, map, selectedLocale) {
    if (!nodeSources.has(node)) nodeSources.set(node, node.nodeValue.trim());
    var source = nodeSources.get(node);
    var value = map[source];
    if (!value) return;
    var translated = value[selectedLocale] || value.en || source;
    var original = node.nodeValue;
    var leading = original.match(/^\s*/)[0];
    var trailing = original.match(/\s*$/)[0];
    node.nodeValue = leading + translated + trailing;
  }

  function apply(root) {
    root = root || document;
    var selectedLocale = locale();
    var map = buildMap(pageKey());
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    var node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(function (textNode) {
      var parent = textNode.parentElement;
      if (!parent || /^(SCRIPT|STYLE|SVG|NOSCRIPT)$/.test(parent.tagName)) return;
      if (parent.closest("[data-i18n], [data-i18n-html], [data-i18n-placeholder]")) return;
      textValue(textNode, map, selectedLocale);
    });
    document.documentElement.lang = selectedLocale === "zh" ? "zh" : "en";
    var titles = {
      home: { en: "DuitJom - Secure Digital Loan Repayment Portal", zh: "DuitJom - 安全数字贷款还款平台" },
      about: { en: "About Us - DuitJom", zh: "关于我们 - DuitJom" },
      blog: { en: "Blog & News - DuitJom", zh: "博客与新闻 - DuitJom" },
      privacy: { en: "Privacy Policy - DuitJom", zh: "隐私政策 - DuitJom" },
      deletion: { en: "Data Deletion - DuitJom", zh: "数据删除 - DuitJom" },
      terms: { en: "Terms & Conditions - DuitJom", zh: "条款与条件 - DuitJom" }
    };
    if (titles[pageKey()]) document.title = titles[pageKey()][selectedLocale];
  }

  function injectSwitcher() {
    if (document.querySelector("[data-dj-page-language]") || document.querySelector("[data-locale-option]")) return;
    var host = document.querySelector(".nav-actions, .navbar-inner") || document.body;
    var wrapper = document.createElement("div");
    wrapper.setAttribute("data-dj-page-language", "true");
    wrapper.style.cssText = "display:inline-flex;align-items:center;gap:4px;margin:10px 0 0 auto;padding:3px;border:1px solid rgba(148,163,184,.25);border-radius:999px;background:rgba(255,255,255,.8);font:700 10px/1 Inter,system-ui,sans-serif;";
    wrapper.innerHTML = '<button type="button" data-dj-locale="en" style="border:0;border-radius:999px;padding:6px 9px;background:transparent;color:#475569;cursor:pointer">🇺🇸 English</button><button type="button" data-dj-locale="zh" style="border:0;border-radius:999px;padding:6px 9px;background:transparent;color:#475569;cursor:pointer">🇨🇳 中文</button>';
    host.appendChild(wrapper);
    wrapper.addEventListener("click", function (event) {
      var button = event.target.closest("[data-dj-locale]");
      if (!button) return;
      setLocale(button.getAttribute("data-dj-locale"));
    });
  }

  function setLocale(nextLocale) {
    if (!supported[nextLocale]) return;
    try { window.localStorage.setItem(STORAGE_KEY, nextLocale); } catch (error) {}
    if (window.DJ_I18N && window.DJ_I18N.getLocale() !== nextLocale) {
      window.DJ_I18N.setLocale(nextLocale);
    } else {
      apply(document);
      updateSwitcher();
    }
  }

  function updateSwitcher() {
    var selectedLocale = locale();
    document.querySelectorAll("[data-dj-page-language] [data-dj-locale]").forEach(function (button) {
      var active = button.getAttribute("data-dj-locale") === selectedLocale;
      button.style.background = active ? "#e0f2fe" : "transparent";
      button.style.color = active ? "#0369a1" : "#475569";
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  window.DJ_PAGE_I18N = { apply: apply, setLocale: setLocale };
  document.addEventListener("DOMContentLoaded", function () {
    injectSwitcher();
    apply(document);
    updateSwitcher();
  });
  document.addEventListener("duitjom:locale-changed", function () {
    window.setTimeout(function () {
      apply(document);
      updateSwitcher();
    }, 0);
  });
  document.addEventListener("duitjom:component-loaded", function (event) {
    if (event.detail && event.detail.containerId) {
      apply(document.getElementById(event.detail.containerId) || document);
    }
  });
})();
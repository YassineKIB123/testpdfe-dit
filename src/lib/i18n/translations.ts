export type Language = "EN" | "FR" | "ES" | "RU" | "AR";

export interface Translations {
  nav: {
    merge: string;
    split: string;
    scan: string;
    convert: string;
    searchPlaceholder: string;
  };
  hero: {
    titleStart: string;
    titleHighlight: string;
    subtitle: string;
    searchPlaceholder: string;
  };
  filters: {
    all: string;
    popular: string;
    scan_edit: string;
    organize: string;
    convert: string;
  };
  tools: {
    scanTitle: string;
    scanDesc: string;
    compressTitle: string;
    compressDesc: string;
    signTitle: string;
    signDesc: string;
    mergeTitle: string;
    mergeDesc: string;
    convertTitle: string;
    convertDesc: string;
    splitTitle: string;
    splitDesc: string;
    rotateTitle: string;
    rotateDesc: string;
    imagesToPdfTitle: string;
    imagesToPdfDesc: string;
    pdfToImagesTitle: string;
    pdfToImagesDesc: string;
  };
  trust: {
    title: string;
    subtitle: string;
    zeroUploads: string;
    zeroUploadsDesc: string;
    speed: string;
    speedDesc: string;
    privacy: string;
    privacyDesc: string;
    portability: string;
    portabilityDesc: string;
  };
  formats: {
    title: string;
    subtitle: string;
    badge: string;
  };
  footer: {
    desc: string;
    rights: string;
    organize: string;
    convert: string;
    editScan: string;
  };
}

export const DICTIONARY: Record<Language, Translations> = {
  EN: {
    nav: {
      merge: "Merge PDF",
      split: "Split PDF",
      scan: "Scan to PDF",
      convert: "Convert PDF",
      searchPlaceholder: "Search tools...",
    },
    hero: {
      titleStart: "Every PDF Tool You Need,",
      titleHighlight: "All in One Place",
      subtitle:
        "Merge, split, scan, sign, convert, edit, and organize your PDF files with fast, easy-to-use client-side tools.",
      searchPlaceholder: "Search all PDF tools (e.g., scan, sign, merge, word)...",
    },
    filters: {
      all: "All Tools",
      popular: "Popular",
      scan_edit: "Scanner & Edit",
      organize: "Organize",
      convert: "Convert",
    },
    tools: {
      scanTitle: "Scan to PDF",
      scanDesc: "Camera capture, automatic corner detection, and B&W document enhancement.",
      compressTitle: "Compress PDF",
      compressDesc: "Reduce PDF file size while maintaining document clarity.",
      signTitle: "Sign PDF",
      signDesc: "Draw or type electronic signatures and position them anywhere on your document.",
      mergeTitle: "Merge PDF",
      mergeDesc: "Combine multiple PDF files into one single document with drag-and-drop order.",
      convertTitle: "Universal Converter",
      convertDesc: "Convert Word, Excel, PowerPoint, Text, and Images to and from PDF.",
      splitTitle: "Split PDF",
      splitDesc: "Extract specific page ranges, odd/even pages, or separate pages into new files.",
      rotateTitle: "Rotate PDF",
      rotateDesc: "Rotate individual pages or entire documents permanently with live visual preview.",
      imagesToPdfTitle: "Images to PDF",
      imagesToPdfDesc: "Convert JPG, PNG, and WebP collections into standard A4 or full-bleed PDFs.",
      pdfToImagesTitle: "PDF to Images",
      pdfToImagesDesc: "Render pages into crisp, high-resolution PNG or JPG image files.",
    },
    trust: {
      title: "Engineered for Security, Speed, and Portability",
      subtitle:
        "A self-contained client-side architecture that eliminates privacy vulnerabilities while delivering enterprise-grade performance.",
      zeroUploads: "Zero Server Uploads",
      zeroUploadsDesc:
        "Documents are parsed, edited, and rendered locally in your browser memory. Files never touch external storage.",
      speed: "Instant Local Speed",
      speedDesc:
        "Powered by compiled WebAssembly and native HTML5 canvas engines. Processing begins immediately with zero queue latency.",
      privacy: "Bank-Grade Privacy",
      privacyDesc:
        "Ideal for medical, legal, and financial records. File buffers are automatically purged upon tab closure.",
      portability: "Universal Portability",
      portabilityDesc:
        "Runs seamlessly across modern browsers on macOS, Windows, Linux, Android, and iOS without native software installations.",
    },
    formats: {
      title: "Supported File Formats & Architecture",
      subtitle: "Compliant with ISO 32000-1 PDF standard and ISO 19005-1 (PDF/A).",
      badge: "Native JavaScript & WebAssembly Engine",
    },
    footer: {
      desc: "A complete, professional, platform-independent PDF tool suite. Merge, split, compress, convert, edit, and sign documents with 100% client-side privacy.",
      rights: "All rights reserved. Zero server tracking.",
      organize: "Organize",
      convert: "Convert",
      editScan: "Edit & Scan",
    },
  },
  FR: {
    nav: {
      merge: "Fusionner PDF",
      split: "Diviser PDF",
      scan: "Numériser en PDF",
      convert: "Convertir PDF",
      searchPlaceholder: "Rechercher des outils...",
    },
    hero: {
      titleStart: "Tous les outils PDF nécessaires,",
      titleHighlight: "En un seul endroit",
      subtitle:
        "Fusionnez, divisez, numérisez, signez et convertissez vos fichiers PDF avec des outils 100% privés côté client.",
      searchPlaceholder: "Rechercher parmi les outils (fusion, signature, scan)...",
    },
    filters: {
      all: "Tous les outils",
      popular: "Populaires",
      scan_edit: "Numériser & Éditer",
      organize: "Organiser",
      convert: "Convertir",
    },
    tools: {
      scanTitle: "Numériser en PDF",
      scanDesc: "Capture caméra, détection automatique des bords et filtres N&B.",
      compressTitle: "Compresser PDF",
      compressDesc: "Réduisez la taille de vos fichiers PDF tout en conservant une grande netteté.",
      signTitle: "Signer le PDF",
      signDesc: "Dessinez ou tapez votre signature et positionnez-la sur le document.",
      mergeTitle: "Fusionner PDF",
      mergeDesc: "Combinez plusieurs fichiers PDF en un seul document ordonné.",
      convertTitle: "Convertisseur Universel",
      convertDesc: "Convertissez Word, Excel, PowerPoint, Texte et Images en PDF.",
      splitTitle: "Diviser PDF",
      splitDesc: "Extrayez des pages spécifiques ou découpez votre document.",
      rotateTitle: "Faire pivoter PDF",
      rotateDesc: "Pivotez des pages individuelles ou le document entier avec aperçu direct.",
      imagesToPdfTitle: "Images en PDF",
      imagesToPdfDesc: "Convertissez des photos JPG, PNG et WebP en PDF formaté.",
      pdfToImagesTitle: "PDF en Images",
      pdfToImagesDesc: "Exportez les pages PDF en images haute résolution PNG ou JPG.",
    },
    trust: {
      title: "Conçu pour la Sécurité, la Rapidité et la Mobilité",
      subtitle:
        "Une architecture côté client qui garantit la confidentialité totale de vos documents.",
      zeroUploads: "Zéro Envoi vers un Serveur",
      zeroUploadsDesc:
        "Les fichiers sont traités dans la mémoire de votre navigateur. Aucun document n'est envoyé sur le cloud.",
      speed: "Vitesse Instantanée",
      speedDesc:
        "Alimenté par WebAssembly et Canvas. Le traitement commence instantanément sans file d'attente.",
      privacy: "Confidentialité Bancaire",
      privacyDesc:
        "Parfait pour les documents légaux, médicaux et fiscaux. La mémoire est vidée à la fermeture de l'onglet.",
      portability: "Portabilité Universelle",
      portabilityDesc:
        "Fonctionne sur tous les navigateurs modernes : macOS, Windows, Linux, iOS et Android sans installation.",
    },
    formats: {
      title: "Formats et Architecture Pris en Charge",
      subtitle: "Conforme aux normes ISO 32000-1 et ISO 19005-1 (PDF/A).",
      badge: "Moteur JavaScript & WebAssembly Natif",
    },
    footer: {
      desc: "Une suite PDF complète et privée. Fusionnez, divisez et signez sans jamais transmettre vos fichiers.",
      rights: "Tous droits réservés. Zéro pistage serveur.",
      organize: "Organiser",
      convert: "Convertir",
      editScan: "Éditer & Scanner",
    },
  },
  ES: {
    nav: {
      merge: "Unir PDF",
      split: "Dividir PDF",
      scan: "Escanear a PDF",
      convert: "Convertir PDF",
      searchPlaceholder: "Buscar herramientas...",
    },
    hero: {
      titleStart: "Todas las herramientas PDF que necesitas,",
      titleHighlight: "En un solo lugar",
      subtitle:
        "Une, divide, escanea, firma, convierte y organiza tus archivos PDF con herramientas 100% privadas en tu navegador.",
      searchPlaceholder: "Buscar herramientas PDF (unir, firmar, escanear)...",
    },
    filters: {
      all: "Todas",
      popular: "Populares",
      scan_edit: "Escanear y Editar",
      organize: "Organizar",
      convert: "Convertir",
    },
    tools: {
      scanTitle: "Escanear a PDF",
      scanDesc: "Captura de cámara, detección de bordes y mejora de contraste.",
      compressTitle: "Comprimir PDF",
      compressDesc: "Reduce el tamaño de tus archivos PDF manteniendo la calidad.",
      signTitle: "Firmar PDF",
      signDesc: "Dibuja o escribe tu firma electrónica y colócala en cualquier página.",
      mergeTitle: "Unir PDF",
      mergeDesc: "Combina varios archivos PDF en un único documento ordenado.",
      convertTitle: "Conversor Universal",
      convertDesc: "Convierte Word, Excel, PowerPoint, texto e imágenes a PDF y viceversa.",
      splitTitle: "Dividir PDF",
      splitDesc: "Extrae rangos de páginas o separa hojas en archivos nuevos.",
      rotateTitle: "Rotar PDF",
      rotateDesc: "Gira páginas individuales o documentos completos con vista previa en vivo.",
      imagesToPdfTitle: "Imágenes a PDF",
      imagesToPdfDesc: "Convierte colecciones de JPG y PNG en documentos PDF.",
      pdfToImagesTitle: "PDF a Imágenes",
      pdfToImagesDesc: "Convierte tus páginas PDF a imágenes de alta resolución.",
    },
    trust: {
      title: "Diseñado para Seguridad, Velocidad y Privacidad",
      subtitle:
        "Arquitectura 100% en el cliente que elimina cualquier riesgo de fuga de datos.",
      zeroUploads: "Cero Subidas al Servidor",
      zeroUploadsDesc:
        "Los documentos se procesan en la memoria local de tu navegador. Nada se sube a servidores remotos.",
      speed: "Velocidad Instantánea",
      speedDesc:
        "Impulsado por WebAssembly y Canvas. Procesamiento inmediato sin colas de espera.",
      privacy: "Privacidad de Nivel Bancario",
      privacyDesc:
        "Ideal para contratos, registros médicos y financieros. Los datos se eliminan al cerrar la pestaña.",
      portability: "Compatibilidad Universal",
      portabilityDesc:
        "Funciona en cualquier navegador moderno en Windows, macOS, Linux, iOS y Android.",
    },
    formats: {
      title: "Formatos Compatibles y Arquitectura",
      subtitle: "Compatible con el estándar ISO 32000-1 y PDF/A.",
      badge: "Motor nativo JavaScript y WebAssembly",
    },
    footer: {
      desc: "Suite PDF profesional y completa sin intermediarios ni servidores.",
      rights: "Todos los derechos reservados. Sin rastreo.",
      organize: "Organizar",
      convert: "Convertir",
      editScan: "Editar y Escanear",
    },
  },
  RU: {
    nav: {
      merge: "Объединить PDF",
      split: "Разделить PDF",
      scan: "Сканировать в PDF",
      convert: "Конвертировать PDF",
      searchPlaceholder: "Поиск инструментов...",
    },
    hero: {
      titleStart: "Все необходимые инструменты PDF,",
      titleHighlight: "В одном месте",
      subtitle:
        "Объединяйте, разделяйте, сканируйте, подписывайте и конвертируйте PDF-файлы прямо в браузере без серверов.",
      searchPlaceholder: "Поиск инструментов (сканирование, подпись, слияние)...",
    },
    filters: {
      all: "Все инструменты",
      popular: "Популярные",
      scan_edit: "Сканирование и правка",
      organize: "Организация",
      convert: "Конвертация",
    },
    tools: {
      scanTitle: "Сканировать в PDF",
      scanDesc: "Съёмка на камеру, автоопределение углов и контрастные фильтры.",
      compressTitle: "Сжать PDF",
      compressDesc: "Уменьшайте размер файлов PDF с сохранением высокого качества.",
      signTitle: "Подписать PDF",
      signDesc: "Нарисуйте или введите электронную подпись и поместите на документ.",
      mergeTitle: "Объединить PDF",
      mergeDesc: "Объединяйте несколько документов PDF в один в нужном порядке.",
      convertTitle: "Универсальный конвертер",
      convertDesc: "Конвертируйте Word, Excel, PowerPoint, текст и изображения в PDF.",
      splitTitle: "Разделить PDF",
      splitDesc: "Извлекайте нужные страницы или разбивайте документ на части.",
      rotateTitle: "Повернуть PDF",
      rotateDesc: "Поворачивайте отдельные страницы или весь документ с предпросмотром.",
      imagesToPdfTitle: "Изображения в PDF",
      imagesToPdfDesc: "Преобразуйте JPG, PNG и WebP в аккуратные PDF-файлы.",
      pdfToImagesTitle: "PDF в изображения",
      pdfToImagesDesc: "Рендеринг страниц PDF в чёткие изображения PNG или JPG.",
    },
    trust: {
      title: "Создано для безопасности, скорости и удобства",
      subtitle:
        "Локальная обработка исключает утечки данных и обеспечивает максимальную производительность.",
      zeroUploads: "Без загрузки на сервер",
      zeroUploadsDesc:
        "Все файлы обрабатываются локально в памяти вашего браузера без передачи в облако.",
      speed: "Мгновенная скорость",
      speedDesc:
        "Работает на WebAssembly и Canvas без сетевых задержек и очередей.",
      privacy: "Банковский уровень защиты",
      privacyDesc:
        "Идеально для конфиденциальных договоров и отчётов. Данные удаляются при закрытии вкладки.",
      portability: "Универсальность",
      portabilityDesc:
        "Работает на macOS, Windows, Linux, Android и iOS прямо в браузере.",
    },
    formats: {
      title: "Поддерживаемые форматы",
      subtitle: "Соответствует стандартам ISO 32000-1 и PDF/A.",
      badge: "Движок JavaScript и WebAssembly",
    },
    footer: {
      desc: "Полный набор локальных инструментов PDF без передачи файлов третьим лицам.",
      rights: "Все права защищены. Без отслеживания.",
      organize: "Организация",
      convert: "Конвертация",
      editScan: "Правка и сканирование",
    },
  },
  AR: {
    nav: {
      merge: "دمج PDF",
      split: "تقسيم PDF",
      scan: "مسح إلى PDF",
      convert: "تحويل PDF",
      searchPlaceholder: "البحث عن أدوات...",
    },
    hero: {
      titleStart: "كل أدوات PDF التي تحتاجها،",
      titleHighlight: "في مكان واحد",
      subtitle:
        "ادمج وقسّم وامسح ووقّع وحوّل ملفاتك مع خصوصية كاملة بنسبة 100% داخل متصفحك.",
      searchPlaceholder: "ابحث عن أي أداة (دمج، توقيع، مسح، تحويل)...",
    },
    filters: {
      all: "جميع الأدوات",
      popular: "الشائعة",
      scan_edit: "المسح والتعديل",
      organize: "تنظيم",
      convert: "تحويل",
    },
    tools: {
      scanTitle: "مسح إلى PDF",
      scanDesc: "التقاط بالكاميرا مع تحديد تلقائي للحواف وفلاتر تباين للمستندات.",
      compressTitle: "ضغط PDF",
      compressDesc: "تقليل حجم ملفات PDF مع الحفاظ على أقصى درجات الوضوح والجودة.",
      signTitle: "توقيع PDF",
      signDesc: "ارسم أو اكتب توقيعك الإلكتروني وضعه في أي مكان في المستند.",
      mergeTitle: "دمج PDF",
      mergeDesc: "دمج عدة ملفات في مستند واحد مع إمكانية الترتيب بالسحب والإفلات.",
      convertTitle: "المحول الشامل",
      convertDesc: "تحويل ملفات Word و Excel و PowerPoint والصور إلى ومن PDF.",
      splitTitle: "تقسيم PDF",
      splitDesc: "استخراج صفحات محددة أو فصل المستند إلى ملفات جديدة.",
      rotateTitle: "تدوير PDF",
      rotateDesc: "تدوير صفحات محددة أو كامل المستند مع معاينة مباشرة.",
      imagesToPdfTitle: "تحويل الصور إلى PDF",
      imagesToPdfDesc: "تحويل صور JPG و PNG إلى ملفات PDF منسقة.",
      pdfToImagesTitle: "تحويل PDF إلى صور",
      pdfToImagesDesc: "استخراج صفحات PDF كصور عالية الدقة بصيغة PNG أو JPG.",
    },
    trust: {
      title: "مصمم للأمان والسرعة والخصوصية المطلقة",
      subtitle:
        "معالجة تتم محلياً بالكامل داخل جهازك دون رفع أي بيانات إلى خوادم خارجية.",
      zeroUploads: "بدون رفع أي ملفات",
      zeroUploadsDesc:
        "تتم معالجة المستندات في ذاكرة المتصفح فقط ولا تصل إلى أي خادم.",
      speed: "سرعة فورية",
      speedDesc:
        "مدعوم بتقنية WebAssembly للبدء الفوري دون طوابير انتظار.",
      privacy: "أمان مصرفي",
      privacyDesc:
        "مثالي للمستندات القانونية والمالية. يتم محو الملفات فور إغلاق الصفحة.",
      portability: "توافق شامل",
      portabilityDesc:
        "يعمل بسلاسة على كافة الأجهزة والمتصفحات دون الحاجة لأي برامج.",
    },
    formats: {
      title: "الصيغ المدعومة والبنية التقنية",
      subtitle: "متوافق مع معايير ISO 32000-1 و PDF/A.",
      badge: "محرك WebAssembly و JavaScript محلي",
    },
    footer: {
      desc: "منصة PDF كاملة تعمل بالكامل على جهازك لضمان السرية والخصوصية.",
      rights: "جميع الحقوق محفوظة. بدون أي تتبع.",
      organize: "تنظيم",
      convert: "تحويل",
      editScan: "تعديل ومسح",
    },
  },
};
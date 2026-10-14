export type ToolType =
  | "edit"
  | "compress"
  | "merge"
  | "split"
  | "rotate"
  | "sign"
  | "scan"
  | "watermark"
  | "sanitize"
  | "pdf-to-word"
  | "word-to-pdf"
  | "pdf-to-excel"
  | "excel-to-pdf"
  | "pdf-to-powerpoint"
  | "powerpoint-to-pdf"
  | "jpg-to-pdf"
  | "pdf-to-jpg"
  | "png-to-pdf"
  | "pdf-to-png"
  | "pdf-to-text"
  | "text-to-pdf";

export type PseoLocale = "en" | "fr" | "es" | "ru" | "ar";

export interface PseoModifier {
  id: string;
  en: string;
  fr: string;
  es: string;
  ru: string;
  ar: string;
  category: "use-case" | "platform" | "size" | "quality";
  targetKb?: number;
  compatibleTools?: ToolType[];
}

export interface PseoPageData {
  slug: string;
  locale: PseoLocale;
  toolType: ToolType;
  baseSlug: string;
  modifierId?: string;
  modifierCategory?: PseoModifier["category"];
  targetKb?: number;
  title: string;
  h1: string;
  metaDescription: string;
  intro: string;
  benefits: string[];
  steps: { title: string; desc: string }[];
  faqs: { q: string; a: string }[];
  relatedSlugs: { href: string; label: string }[];
  variationLinks: { href: string; label: string }[];
}

export const BASE_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://pdftool.fenangplay.workers.dev";

// 18 Core Tool Definitions
export const CORE_TOOLS: {
  type: ToolType;
  baseSlug: string;
  names: Record<PseoLocale, string>;
  action: Record<PseoLocale, string>;
}[] = [
  {
    type: "edit",
    baseSlug: "edit-pdf",
    names: {
      en: "Edit PDF Text",
      fr: "Modifier Texte PDF",
      es: "Editar Texto PDF",
      ru: "Редактировать текст PDF",
      ar: "تعديل النص في ملف PDF",
    },
    action: {
      en: "edit existing text, numbers, and paragraphs inside PDF files",
      fr: "modifier le texte existant, les chiffres et les paragraphes d'un PDF",
      es: "editar el texto existente, números y párrafos dentro de un PDF",
      ru: "редактировать существующий текст и абзацы прямо в файле PDF",
      ar: "تعديل النصوص والأرقام والفقرات الموجودة داخل ملفات PDF",
    },
  },
  {
    type: "watermark",
    baseSlug: "watermark-pdf",
    names: {
      en: "Watermark & Page Numbers PDF",
      fr: "Filigrane et Numéros de Page PDF",
      es: "Marca de Agua y Numerar PDF",
      ru: "Водяной знак и нумерация PDF",
      ar: "إضافة علامة مائية وترقيم صفحات PDF",
    },
    action: {
      en: "stamp diagonal watermarks and page numbers onto PDF",
      fr: "ajouter un filigrane et numéroter les pages d'un PDF",
      es: "añadir marca de agua y numeración de páginas a un PDF",
      ru: "добавить водяной знак и нумерацию страниц в PDF",
      ar: "إضافة علامة مائية وترقيم الصفحات لملف PDF",
    },
  },
  {
    type: "sanitize",
    baseSlug: "sanitize-pdf",
    names: {
      en: "Sanitize & Strip PDF Metadata",
      fr: "Nettoyer et Supprimer les Métadonnées PDF",
      es: "Limpiar y Eliminar Metadatos PDF",
      ru: "Очистить метаданные PDF",
      ar: "إزالة البيانات الوصفية وتنظيف PDF",
    },
    action: {
      en: "remove hidden author, XMP, and timestamp metadata from PDF",
      fr: "supprimer les métadonnées cachées et l'auteur d'un fichier PDF",
      es: "eliminar metadatos ocultos y rastro de autor de un PDF",
      ru: "удалить скрытые метаданные автора и истории из PDF",
      ar: "إزالة البيانات الوصفية المخفية واسم المؤلف من ملف PDF",
    },
  },
  {
    type: "compress",
    baseSlug: "compress-pdf",
    names: {
      en: "Compress PDF",
      fr: "Compresser PDF",
      es: "Comprimir PDF",
      ru: "Сжать PDF",
      ar: "ضغط PDF",
    },
    action: {
      en: "reduce PDF file size",
      fr: "réduire la taille du fichier PDF",
      es: "reducir el tamaño del archivo PDF",
      ru: "уменьшить размер файла PDF",
      ar: "تقليل حجم ملف PDF",
    },
  },
  {
    type: "merge",
    baseSlug: "merge-pdf",
    names: {
      en: "Merge PDF",
      fr: "Fusionner PDF",
      es: "Unir PDF",
      ru: "Объединить PDF",
      ar: "دمج PDF",
    },
    action: {
      en: "combine multiple PDF files",
      fr: "combiner plusieurs fichiers PDF",
      es: "combinar varios archivos PDF",
      ru: "объединить несколько файлов PDF",
      ar: "دمج عدة ملفات PDF",
    },
  },
  {
    type: "split",
    baseSlug: "split-pdf",
    names: {
      en: "Split PDF",
      fr: "Diviser PDF",
      es: "Dividir PDF",
      ru: "Разделить PDF",
      ar: "تقسيم PDF",
    },
    action: {
      en: "extract pages from PDF",
      fr: "extraire des pages d'un PDF",
      es: "extraer páginas de un PDF",
      ru: "извлечь страницы из PDF",
      ar: "استخراج صفحات من PDF",
    },
  },
  {
    type: "sign",
    baseSlug: "sign-pdf",
    names: {
      en: "Sign PDF",
      fr: "Signer PDF",
      es: "Firmar PDF",
      ru: "Подписать PDF",
      ar: "توقيع PDF",
    },
    action: {
      en: "add electronic signature to PDF",
      fr: "signer électroniquement un PDF",
      es: "firmar electrónicamente un PDF",
      ru: "электронно подписать PDF",
      ar: "إضافة توقيع إلكتروني إلى PDF",
    },
  },
  {
    type: "scan",
    baseSlug: "scan-pdf",
    names: {
      en: "Scan to PDF",
      fr: "Numériser en PDF",
      es: "Escanear a PDF",
      ru: "Сканировать в PDF",
      ar: "مسح إلى PDF",
    },
    action: {
      en: "scan camera documents to PDF",
      fr: "numériser des documents avec l'appareil photo en PDF",
      es: "escanear documentos con la cámara a PDF",
      ru: "сканировать документы с камеры в PDF",
      ar: "مسح المستندات بالكاميرا إلى PDF",
    },
  },
  {
    type: "rotate",
    baseSlug: "rotate-pdf",
    names: {
      en: "Rotate PDF",
      fr: "Pivoter PDF",
      es: "Rotar PDF",
      ru: "Повернуть PDF",
      ar: "تدوير PDF",
    },
    action: {
      en: "rotate PDF pages permanently",
      fr: "faire pivoter les pages PDF de façon permanente",
      es: "rotar páginas PDF permanentemente",
      ru: "навсегда повернуть страницы PDF",
      ar: "تدوير صفحات PDF بشكل دائم",
    },
  },
  {
    type: "pdf-to-word",
    baseSlug: "pdf-to-word",
    names: {
      en: "PDF to Word",
      fr: "PDF en Word",
      es: "PDF a Word",
      ru: "PDF в Word",
      ar: "تحويل PDF إلى Word",
    },
    action: {
      en: "convert PDF into editable Word DOCX",
      fr: "convertir un PDF en document Word DOCX modifiable",
      es: "convertir PDF a documento Word DOCX editable",
      ru: "конвертировать PDF в редактируемый Word DOCX",
      ar: "تحويل ملف PDF إلى مستند Word قابل للتعديل",
    },
  },
  {
    type: "word-to-pdf",
    baseSlug: "word-to-pdf",
    names: {
      en: "Word to PDF",
      fr: "Word en PDF",
      es: "Word a PDF",
      ru: "Word в PDF",
      ar: "تحويل Word إلى PDF",
    },
    action: {
      en: "convert Word DOCX documents to standard PDF",
      fr: "convertir des documents Word DOCX en PDF",
      es: "convertir documentos Word DOCX a PDF",
      ru: "конвертировать файлы Word DOCX в PDF",
      ar: "تحويل مستندات Word إلى صيغة PDF",
    },
  },
  {
    type: "pdf-to-excel",
    baseSlug: "pdf-to-excel",
    names: {
      en: "PDF to Excel",
      fr: "PDF en Excel",
      es: "PDF a Excel",
      ru: "PDF в Excel",
      ar: "تحويل PDF إلى Excel",
    },
    action: {
      en: "extract tables and data from PDF to Excel XLSX",
      fr: "extraire des tableaux et données PDF vers Excel XLSX",
      es: "extraer tablas y datos de PDF a Excel XLSX",
      ru: "извлечь таблицы и данные из PDF в Excel XLSX",
      ar: "استخراج الجداول والبيانات من PDF إلى Excel",
    },
  },
  {
    type: "excel-to-pdf",
    baseSlug: "excel-to-pdf",
    names: {
      en: "Excel to PDF",
      fr: "Excel en PDF",
      es: "Excel a PDF",
      ru: "Excel в PDF",
      ar: "تحويل Excel إلى PDF",
    },
    action: {
      en: "convert Excel spreadsheets to landscape PDF",
      fr: "convertir des feuilles de calcul Excel en PDF",
      es: "convertir hojas de cálculo Excel a PDF",
      ru: "конвертировать таблицы Excel в PDF",
      ar: "تحويل جداول بيانات Excel إلى مستند PDF",
    },
  },
  {
    type: "pdf-to-powerpoint",
    baseSlug: "pdf-to-powerpoint",
    names: {
      en: "PDF to PowerPoint",
      fr: "PDF en PowerPoint",
      es: "PDF a PowerPoint",
      ru: "PDF в PowerPoint",
      ar: "تحويل PDF إلى PowerPoint",
    },
    action: {
      en: "convert PDF pages into PowerPoint PPTX slides",
      fr: "convertir des pages PDF en diapositives PowerPoint",
      es: "convertir páginas PDF en diapositivas PowerPoint",
      ru: "конвертировать страницы PDF в слайды PowerPoint",
      ar: "تحويل صفحات PDF إلى شرائح PowerPoint",
    },
  },
  {
    type: "powerpoint-to-pdf",
    baseSlug: "powerpoint-to-pdf",
    names: {
      en: "PowerPoint to PDF",
      fr: "PowerPoint en PDF",
      es: "PowerPoint a PDF",
      ru: "PowerPoint в PDF",
      ar: "تحويل PowerPoint إلى PDF",
    },
    action: {
      en: "convert PowerPoint PPTX presentation to PDF",
      fr: "convertir des présentations PowerPoint en PDF",
      es: "convertir presentaciones PowerPoint a PDF",
      ru: "конвертировать презентации PowerPoint в PDF",
      ar: "تحويل عروض PowerPoint إلى مستندات PDF",
    },
  },
  {
    type: "jpg-to-pdf",
    baseSlug: "jpg-to-pdf",
    names: {
      en: "JPG to PDF",
      fr: "JPG en PDF",
      es: "JPG a PDF",
      ru: "JPG в PDF",
      ar: "تحويل JPG إلى PDF",
    },
    action: {
      en: "convert JPG photos into formatted PDF",
      fr: "convertir des photos JPG en PDF",
      es: "convertir fotos JPG en PDF",
      ru: "конвертировать фото JPG в PDF",
      ar: "تحويل صور JPG إلى مستند PDF",
    },
  },
  {
    type: "pdf-to-jpg",
    baseSlug: "pdf-to-jpg",
    names: {
      en: "PDF to JPG",
      fr: "PDF en JPG",
      es: "PDF a JPG",
      ru: "PDF в JPG",
      ar: "تحويل PDF إلى JPG",
    },
    action: {
      en: "export PDF pages to high-resolution JPG images",
      fr: "exporter les pages PDF en images JPG haute résolution",
      es: "exportar páginas PDF a imágenes JPG de alta resolución",
      ru: "экспортировать страницы PDF в качественные изображения JPG",
      ar: "تصدير صفحات PDF كصور JPG عالية الدقة",
    },
  },
  {
    type: "png-to-pdf",
    baseSlug: "png-to-pdf",
    names: {
      en: "PNG to PDF",
      fr: "PNG en PDF",
      es: "PNG a PDF",
      ru: "PNG в PDF",
      ar: "تحويل PNG إلى PDF",
    },
    action: {
      en: "combine PNG images into clean PDF documents",
      fr: "combiner des images PNG en PDF",
      es: "combinar imágenes PNG en documentos PDF",
      ru: "объединить изображения PNG в файлы PDF",
      ar: "دمج صور PNG في ملفات PDF",
    },
  },
  {
    type: "pdf-to-png",
    baseSlug: "pdf-to-png",
    names: {
      en: "PDF to PNG",
      fr: "PDF en PNG",
      es: "PDF a PNG",
      ru: "PDF в PNG",
      ar: "تحويل PDF إلى PNG",
    },
    action: {
      en: "render PDF pages to lossless PNG graphics",
      fr: "rendre des pages PDF en images PNG sans perte",
      es: "convertir páginas PDF a imágenes PNG sin pérdida",
      ru: "рендерить страницы PDF в графику PNG без потерь",
      ar: "تحويل صفحات PDF إلى صور PNG فائقة النقاء",
    },
  },
  {
    type: "pdf-to-text",
    baseSlug: "pdf-to-text",
    names: {
      en: "PDF to Text",
      fr: "PDF en Texte",
      es: "PDF a Texto",
      ru: "PDF в Текст",
      ar: "تحويل PDF إلى نص",
    },
    action: {
      en: "extract raw textual content from PDF files",
      fr: "extraire le texte brut de fichiers PDF",
      es: "extraer texto plano de archivos PDF",
      ru: "извлечь чистый текст из файлов PDF",
      ar: "استخراج النص الصافي من ملفات PDF",
    },
  },
  {
    type: "text-to-pdf",
    baseSlug: "text-to-pdf",
    names: {
      en: "Text to PDF",
      fr: "Texte en PDF",
      es: "Texto a PDF",
      ru: "Текст в PDF",
      ar: "تحويل النص إلى PDF",
    },
    action: {
      en: "convert plain text and notes into structured PDF",
      fr: "convertir du texte brut en document PDF structuré",
      es: "convertir texto sin formato en documento PDF",
      ru: "конвертировать простой текст в структурированный PDF",
      ar: "تحويل النصوص والملاحظات إلى مستند PDF منسق",
    },
  },
];

// Programmatic Intent Modifiers with Smart Tool Compatibility Filtering
export const MODIFIERS: PseoModifier[] = [
  {
    id: "for-resumes",
    en: "for Resumes and CVs",
    fr: "pour CV et Candidatures",
    es: "para Currículums y CV",
    ru: "для резюме",
    ar: "للسير الذاتية",
    category: "use-case",
  },
  {
    id: "for-email",
    en: "for Email Attachments",
    fr: "pour Pièces Jointes d'Email",
    es: "para Enviar por Correo Electrónico",
    ru: "для отправки по почте",
    ar: "لمرفقات البريد الإلكتروني",
    category: "size",
  },
  {
    id: "for-contracts",
    en: "for Legal Contracts & Agreements",
    fr: "pour Contrats et Accords Juridiques",
    es: "para Contratos y Acuerdos Legales",
    ru: "для юридических договоров",
    ar: "للعقود والاتفاقيات القانونية",
    category: "use-case",
  },
  {
    id: "for-invoices",
    en: "for Invoices & Billing",
    fr: "pour Factures et Comptabilité",
    es: "para Facturas y Cobros",
    ru: "для счетов и бухгалтерии",
    ar: "للفواتير والمستندات المالية",
    category: "use-case",
  },
  {
    id: "for-bank-statements",
    en: "for Bank Statements",
    fr: "pour Relevés Bancaires",
    es: "para Extractos Bancarios",
    ru: "для банковских выписок",
    ar: "لكشوفات الحساب البنكية",
    category: "use-case",
  },
  {
    id: "for-tax-forms",
    en: "for Tax Forms & Returns",
    fr: "pour Déclarations Fiscales",
    es: "para Formularios de Impuestos",
    ru: "для налоговых деклараций",
    ar: "للإقرارات والنماذج الضريبية",
    category: "use-case",
  },
  {
    id: "for-students",
    en: "for Students & Homework",
    fr: "pour Étudiants et Devoirs",
    es: "para Estudiantes y Tareas",
    ru: "для студентов и домашних заданий",
    ar: "للطلاب والواجبات المدرسية",
    category: "use-case",
  },
  {
    id: "for-teachers",
    en: "for Teachers & Classrooms",
    fr: "pour Enseignants et Cours",
    es: "para Profesores y Aulas",
    ru: "для учителей и уроков",
    ar: "للمعلمين والأنشطة التعليمية",
    category: "use-case",
  },
  {
    id: "for-lawyers",
    en: "for Lawyers & Court Submissions",
    fr: "pour Avocats et Dossiers Judiciaires",
    es: "para Abogados y Trámites Judiciales",
    ru: "для юристов и судебных дел",
    ar: "للمحامين والملفات القضائية",
    category: "use-case",
  },
  {
    id: "for-real-estate",
    en: "for Real Estate Agents & Deeds",
    fr: "pour l'Immobilier et Actes Notariés",
    es: "para Bienes Raíces y Escrituras",
    ru: "для недвижимости и сделок",
    ar: "للعقارات والمعاملات العقارية",
    category: "use-case",
  },
  {
    id: "for-accountants",
    en: "for Accountants & Financial Audits",
    fr: "pour Comptables et Audits Financiers",
    es: "para Contadores y Auditorías",
    ru: "для бухгалтеров и финансового аудита",
    ar: "للمحاسبين والتدقيق المالي",
    category: "use-case",
  },
  {
    id: "for-medical-records",
    en: "for Medical Records & Patients",
    fr: "pour Dossiers Médicaux et Patients",
    es: "para Historiales Médicos y Pacientes",
    ru: "для медицинских карт и анализов",
    ar: "للسجلات والتقارير الطبية",
    category: "use-case",
  },
  {
    id: "for-ebooks",
    en: "for Ebooks & Digital Books",
    fr: "pour Livres Numériques et Ebooks",
    es: "para Libros Electrónicos y Ebooks",
    ru: "для электронных книг",
    ar: "للكتب الإلكترونية والروايات",
    category: "use-case",
  },
  {
    id: "for-research-papers",
    en: "for Scientific Research Papers",
    fr: "pour Articles de Recherche Scientifique",
    es: "para Artículos de Investigación Científica",
    ru: "для научных статей и исследований",
    ar: "للأوراق البحثية والأكاديمية",
    category: "use-case",
  },
  {
    id: "for-passports-and-visas",
    en: "for Passport & Visa Applications",
    fr: "pour Demandes de Passeport et Visa",
    es: "para Solicitudes de Pasaporte y Visa",
    ru: "для подачи на визы и паспорта",
    ar: "لمعاملات الجوازات والتأشيرات",
    category: "use-case",
  },
  {
    id: "under-100kb",
    en: "to Under 100 KB",
    fr: "à Moins de 100 Ko",
    es: "a Menos de 100 KB",
    ru: "до 100 КБ",
    ar: "إلى أقل من 100 كيلوبايت",
    category: "size",
    targetKb: 100,
    compatibleTools: ["compress", "scan", "jpg-to-pdf", "png-to-pdf", "word-to-pdf"],
  },
  {
    id: "under-200kb",
    en: "to Under 200 KB",
    fr: "à Moins de 200 Ko",
    es: "a Menos de 200 KB",
    ru: "до 200 КБ",
    ar: "إلى أقل من 200 كيلوبايت",
    category: "size",
    targetKb: 200,
    compatibleTools: ["compress", "scan", "jpg-to-pdf", "png-to-pdf", "word-to-pdf"],
  },
  {
    id: "under-500kb",
    en: "to Under 500 KB",
    fr: "à Moins de 500 Ko",
    es: "a Menos de 500 KB",
    ru: "до 500 КБ",
    ar: "إلى أقل من 500 كيلوبايت",
    category: "size",
    targetKb: 500,
    compatibleTools: ["compress", "scan", "jpg-to-pdf", "png-to-pdf", "word-to-pdf", "merge"],
  },
  {
    id: "under-1mb",
    en: "to Under 1 MB",
    fr: "à Moins de 1 Mo",
    es: "a Menos de 1 MB",
    ru: "до 1 МБ",
    ar: "إلى أقل من 1 ميجابايت",
    category: "size",
    targetKb: 1024,
    compatibleTools: ["compress", "scan", "jpg-to-pdf", "png-to-pdf", "word-to-pdf", "merge"],
  },
  {
    id: "under-2mb",
    en: "to Under 2 MB",
    fr: "à Moins de 2 Mo",
    es: "a Menos de 2 MB",
    ru: "до 2 МБ",
    ar: "إلى أقل من 2 ميجابايت",
    category: "size",
    targetKb: 2048,
    compatibleTools: ["compress", "scan", "jpg-to-pdf", "png-to-pdf", "word-to-pdf", "merge"],
  },
  {
    id: "on-mac",
    en: "on Mac Without Software",
    fr: "sur Mac Sans Logiciel",
    es: "en Mac Sin Instalar Programas",
    ru: "на Mac без установки программ",
    ar: "على أجهزة Mac بدون برامج",
    category: "platform",
  },
  {
    id: "on-windows",
    en: "on Windows 10 & 11",
    fr: "sur Windows 10 et 11",
    es: "en Windows 10 y 11",
    ru: "на Windows 10 и 11",
    ar: "على أنظمة Windows 10 و 11",
    category: "platform",
  },
  {
    id: "on-iphone",
    en: "on iPhone & iPad Safari",
    fr: "sur iPhone et iPad Safari",
    es: "en iPhone y iPad Safari",
    ru: "на iPhone и iPad через Safari",
    ar: "على iPhone و iPad عبر Safari",
    category: "platform",
  },
  {
    id: "on-android",
    en: "on Android Mobile Phones",
    fr: "sur Téléphones Android",
    es: "en Teléfonos Android",
    ru: "на смартфонах Android",
    ar: "على هواتف وأجهزة Android",
    category: "platform",
  },
  {
    id: "on-chromebook",
    en: "on Chromebook & ChromeOS",
    fr: "sur Chromebook et ChromeOS",
    es: "en Chromebook y ChromeOS",
    ru: "на Chromebook и ChromeOS",
    ar: "على أجهزة Chromebook",
    category: "platform",
  },
  {
    id: "offline",
    en: "Offline in Browser",
    fr: "Hors Ligne dans le Navigateur",
    es: "Sin Conexión en el Navegador",
    ru: "офлайн прямо в браузере",
    ar: "بدون إنترنت داخل المتصفح",
    category: "platform",
  },
  {
    id: "without-uploading",
    en: "Without Uploading (100% Private)",
    fr: "Sans Téléversement (100% Privé)",
    es: "Sin Subir a Servidores (100% Privado)",
    ru: "без загрузки в облако (100% приватность)",
    ar: "بدون رفع الملفات (خصوصية 100%)",
    category: "quality",
  },
  {
    id: "without-watermark",
    en: "Without Watermark (Clean Output)",
    fr: "Sans Filigrane (Sortie Propre)",
    es: "Sin Marcas de Agua (Resultado Limpio)",
    ru: "без водяных знаков и логотипов",
    ar: "بدون علامة مائية نهائياً",
    category: "quality",
  },
  {
    id: "lossless-quality",
    en: "with Lossless Original Quality",
    fr: "avec Qualité Originale Sans Perte",
    es: "con Calidad Original Sin Pérdida",
    ru: "с сохранением исходного качества",
    ar: "بجودة أصلية وبدون فقدان للتفاصيل",
    category: "quality",
    compatibleTools: ["compress", "merge", "split", "rotate", "jpg-to-pdf", "png-to-pdf", "pdf-to-jpg", "pdf-to-png"],
  },
  {
    id: "editable-text",
    en: "with Editable Formatting",
    fr: "avec Formatage Modifiable",
    es: "con Formato Editable",
    ru: "с возможностью редактирования текста",
    ar: "مع إمكانية تعديل النصوص وتنسيقها",
    category: "quality",
    compatibleTools: ["edit", "pdf-to-word", "pdf-to-excel", "pdf-to-powerpoint", "pdf-to-text"],
  },
  {
    id: "high-resolution-300dpi",
    en: "in High Resolution 300 DPI",
    fr: "en Haute Résolution 300 DPI",
    es: "en Alta Resolución 300 DPI",
    ru: "в высоком разрешении 300 DPI",
    ar: "بدقة فائقة 300 DPI للطباعة",
    category: "quality",
    compatibleTools: ["scan", "pdf-to-jpg", "pdf-to-png", "jpg-to-pdf", "png-to-pdf"],
  },
  {
    id: "no-file-limit",
    en: "with No File Size Limits",
    fr: "sans Limite de Taille",
    es: "sin Límites de Tamaño",
    ru: "без ограничений по объёму файла",
    ar: "بدون حد أقصى لحجم الملفات",
    category: "quality",
  },
  {
    id: "for-job-applications",
    en: "for Online Job Portals",
    fr: "pour Portails d'Emploi en Ligne",
    es: "para Portales de Empleo",
    ru: "для сайтов вакансий",
    ar: "لبوابات التوظيف والتقديم",
    category: "use-case",
  },
  {
    id: "for-court-filings",
    en: "for Court E-Filing Standards",
    fr: "pour Dépôt Électronique au Tribunal",
    es: "para Presentación Judicial Electrónica",
    ru: "для электронной подачи в суд",
    ar: "للمعاملات والمحاكم الإلكترونية",
    category: "use-case",
  },
  {
    id: "for-scholarships",
    en: "for University Admissions & Grants",
    fr: "pour Bourses et Inscriptions Universitaires",
    es: "para Becas y Matrículas Universitarias",
    ru: "для грантов и поступления в вузы",
    ar: "للمنح والتسجيل الجامعي",
    category: "use-case",
  },
];

export function isModifierCompatible(toolType: ToolType, mod: PseoModifier): boolean {
  if (!mod.compatibleTools) return true;
  return mod.compatibleTools.includes(toolType);
}

// Helper to generate slug strings
export function buildPseoSlug(baseSlug: string, modifierId?: string): string {
  if (!modifierId) return baseSlug;
  return `${baseSlug}-${modifierId}`;
}

// Module-level memoization caches to prevent O(N^2) rebuilds during static export
let _cachedPages: PseoPageData[] | null = null;
let _cachedMap: Map<string, PseoPageData> | null = null;

export function generateAllPseoPages(): PseoPageData[] {
  if (_cachedPages) return _cachedPages;

  const pages: PseoPageData[] = [];
  const locales: PseoLocale[] = ["en", "fr", "es", "ru", "ar"];

  for (const locale of locales) {
    for (const tool of CORE_TOOLS) {
      // 1. Base Tool Page
      const baseSlug = tool.baseSlug;
      pages.push(buildPageRecord(tool, undefined, locale, baseSlug));

      // 2. Compatible Programmatic Modifier Pages
      for (const mod of MODIFIERS) {
        if (!isModifierCompatible(tool.type, mod)) continue;
        const slug = buildPseoSlug(tool.baseSlug, mod.id);
        pages.push(buildPageRecord(tool, mod, locale, slug));
      }
    }
  }

  _cachedPages = pages;
  return pages;
}

export function getPseoPage(locale: PseoLocale, slug: string): PseoPageData | undefined {
  if (!_cachedMap) {
    const all = generateAllPseoPages();
    _cachedMap = new Map<string, PseoPageData>();
    for (const p of all) {
      _cachedMap.set(`${p.locale}:${p.slug}`, p);
    }
  }
  return _cachedMap.get(`${locale}:${slug}`);
}

function getLocalizedBenefits(
  locale: PseoLocale,
  toolName: string,
  mod?: PseoModifier
): string[] {
  const modText = mod ? mod[locale] : "";

  switch (locale) {
    case "fr":
      return [
        `100% Local : Aucun fichier envoyé sur un serveur pour ${toolName.toLowerCase()}${modText ? ` ${modText}` : ""}`,
        "Zéro Filigrane : Exportez des documents PDF propres, conformes à la norme ISO 32000-1",
        "Multi-Plateforme : Compatible macOS, Windows, Linux, iPhone/iPad (Safari) et Android",
        "Mode Hors Ligne : Le moteur WebAssembly et Canvas fonctionne même sans connexion Internet",
      ];
    case "es":
      return [
        `100% Privado en el Navegador: Procesamiento local para ${toolName.toLowerCase()}${modText ? ` ${modText}` : ""} sin subir archivos`,
        "Sin Marcas de Agua: Genera documentos profesionales listos para entrega oficial",
        "Multiplataforma: Funciona al instante en Windows, Mac, iOS Safari y teléfonos Android",
        "Capacidad Sin Conexión: El motor WebAssembly procesa tus archivos en la memoria RAM local",
      ];
    case "ru":
      return [
        `100% в браузере: локальная обработка «${toolName}»${modText ? ` (${modText})` : ""} без загрузки на сервер`,
        "Без водяных знаков: чистые профессиональные документы стандарта ISO 32000-1",
        "Кроссплатформенность: работает на Windows, macOS, iPhone, iPad и Android без установки",
        "Офлайн-режим: движок WebAssembly и HTML5 Canvas работает даже без интернета",
      ];
    case "ar":
      return [
        `معالجة محلية 100%: أداة ${toolName}${modText ? ` ${modText}` : ""} تعمل داخل متصفحك دون رفع أي ملفات`,
        "بدون علامة مائية: تصدير مستندات رسمية نظيفة وجاهزة للطباعة أو الإرسال",
        "متوافق مع جميع الأجهزة: يعمل فوراً على الحاسوب وهواتف iPhone و Android",
        "يعمل بدون إنترنت: محرك WebAssembly يعالج صفحاتك مباشرة في الذاكرة المحلية",
      ];
    default:
      return [
        `100% Client-Side: Zero server uploads or cloud logs when you ${toolName.toLowerCase()}${modText ? ` ${modText}` : ""}`,
        "No Watermarks: Export clean, ISO-compliant documents ready for official submission",
        "Cross-Platform: Runs smoothly across macOS, Windows, iOS Safari, and Android Chrome",
        "Offline Capable: WebAssembly & HTML5 Canvas engine runs even without an active connection",
      ];
  }
}

function getLocalizedSteps(
  locale: PseoLocale,
  toolName: string,
  mod?: PseoModifier
): { title: string; desc: string }[] {
  const modText = mod ? ` ${mod[locale]}` : "";
  switch (locale) {
    case "fr":
      return [
        {
          title: "1. Sélectionnez ou glissez votre fichier",
          desc: `Déposez votre document dans la zone sécurisée pour lancer ${toolName}${modText} directement en mémoire locale.`,
        },
        {
          title: "2. Ajustez les paramètres",
          desc: mod?.targetKb
            ? `Choisissez le mode de compression adapté pour atteindre moins de ${mod.targetKb} Ko tout en préservant la lisibilité.`
            : "Prévisualisez les pages et configurez vos options en temps réel sans file d'attente.",
        },
        {
          title: "3. Téléchargement instantané",
          desc: "Enregistrez votre fichier finalisé directement sur votre appareil en un clic, sans filigrane.",
        },
      ];
    case "es":
      return [
        {
          title: "1. Selecciona o arrastra tu archivo",
          desc: `Suelta tu documento en el área de trabajo para iniciar ${toolName}${modText} localmente en tu navegador.`,
        },
        {
          title: "2. Configura las opciones",
          desc: mod?.targetKb
            ? `Ajusta el nivel de optimización para reducir el peso por debajo de ${mod.targetKb} KB manteniendo la nitidez.`
            : "Previsualiza el documento y personaliza los ajustes en tiempo real sin esperas.",
        },
        {
          title: "3. Descarga local inmediata",
          desc: "Guarda el documento procesado directamente en tu dispositivo sin marcas de agua ni registros en la nube.",
        },
      ];
    case "ru":
      return [
        {
          title: "1. Выберите или перетащите файл",
          desc: `Перетащите документ в рабочую область для запуска «${toolName}${modText}» прямо в оперативной памяти браузера.`,
        },
        {
          title: "2. Настройте параметры",
          desc: mod?.targetKb
            ? `Выберите уровень сжатия для достижения размера менее ${mod.targetKb} КБ без потери чёткости текста.`
            : "Проверьте предпросмотр страниц и настройте параметры в реальном времени без очередей.",
        },
        {
          title: "3. Мгновенное скачивание",
          desc: "Сохраните готовый файл сразу на ваше устройство без водяных знаков и ограничений.",
        },
      ];
    case "ar":
      return [
        {
          title: "1. اختر المستند أو اسحبه",
          desc: `اسحب الملف وأفلته في المربع المخصص لبدء ${toolName}${modText} فوراً داخل ذاكرة المتصفح.`,
        },
        {
          title: "2. اضبط الإعدادات والمعاينة",
          desc: mod?.targetKb
            ? `اختر مستوى الضغط المناسب لتقليل الحجم إلى أقل من ${mod.targetKb} كيلوبايت مع الحفاظ على وضوح النص.`
            : "عاين الصفحات واضبط الخيارات المطلوبة بشكل مباشر وبدون أي انتظار.",
        },
        {
          title: "3. تنزيل فوري على جهازك",
          desc: "احصل على المستند النهائي بنقرة واحدة مباشرة على جهازك بدون أي علامة مائية.",
        },
      ];
    default:
      return [
        {
          title: "1. Select or Drop Your File",
          desc: `Drag and drop your document into the workspace to start ${toolName}${modText} locally in browser memory.`,
        },
        {
          title: "2. Configure & Preview Settings",
          desc: mod?.targetKb
            ? `Select your compression preset to hit your under-${mod.targetKb} KB target while keeping text razor-sharp.`
            : "Preview pages and fine-tune your parameters with real-time visual feedback.",
        },
        {
          title: "3. Instant Local Download",
          desc: "Save the processed, watermark-free document straight to your device storage.",
        },
      ];
  }
}

function getLocalizedFaqs(
  locale: PseoLocale,
  toolName: string,
  actionText: string,
  mod?: PseoModifier
): { q: string; a: string }[] {
  const modLabel = mod ? ` ${mod[locale]}` : "";

  if (locale === "fr") {
    return [
      {
        q: `Comment ${actionText}${modLabel} gratuitement et sans risque ?`,
        a: `Grâce à notre moteur WebAssembly et HTML5 Canvas, l'outil ${toolName}${modLabel} s'exécute à 100% dans la mémoire vive (RAM) de votre navigateur. Aucun octet n'est envoyé vers un serveur distant.`,
      },
      {
        q: mod?.targetKb
          ? `Puis-je vraiment réduire mon PDF à moins de ${mod.targetKb} Ko ?`
          : "Y a-t-il des limites sur la taille du fichier ou le nombre de pages ?",
        a: mod?.targetKb
          ? `Oui. Utilisez le mode « Compression Extrême » ou « Recommandée » pour ré-encoder les flux d'images internes et supprimer les métadonnées superflues afin de passer sous la barre des ${mod.targetKb} Ko.`
          : "Aucune limite artificielle. Tant que votre appareil dispose de suffisamment de mémoire vive, vous pouvez traiter des documents volumineux sans blocage.",
      },
      {
        q: "Mon document téléchargé contiendra-t-il un filigrane ?",
        a: "Jamais. Tous les fichiers générés par PDFStudio sont propres, sans filigrane et prêts pour un usage professionnel, juridique ou académique.",
      },
      {
        q: "Cet outil fonctionne-t-il sur Mac, Windows, iPhone et Android ?",
        a: "Oui, l'interface s'adapte automatiquement à Safari (iOS/macOS), Chrome, Edge et Firefox sur ordinateur, tablette et smartphone.",
      },
    ];
  }

  if (locale === "es") {
    return [
      {
        q: `¿Cómo puedo ${actionText}${modLabel} de forma gratuita y segura?`,
        a: `La herramienta ${toolName}${modLabel} funciona 100% dentro de la memoria RAM de tu navegador mediante WebAssembly y HTML5 Canvas. Tus documentos nunca se suben a ningún servidor externo.`,
      },
      {
        q: mod?.targetKb
          ? `¿Cómo consigo que mi archivo pese menos de ${mod.targetKb} KB?`
          : "¿Existen límites en el tamaño del archivo o número de páginas?",
        a: mod?.targetKb
          ? `Selecciona el nivel de compresión "Extrema" o "Recomendada" para optimizar las imágenes incrustadas y limpiar flujos redundantes hasta alcanzar menos de ${mod.targetKb} KB.`
          : "No imponemos límites artificiales ni muros de pago. Puedes procesar documentos de cualquier tamaño según la memoria disponible en tu dispositivo.",
      },
      {
        q: "¿Se añaden marcas de agua al documento exportado?",
        a: "Nunca. Todos los archivos exportados están libres de marcas de agua y cumplen con el estándar oficial ISO 32000-1.",
      },
      {
        q: "¿Puedo usar esta herramienta en el móvil o tablet?",
        a: "Sí, es totalmente compatible con Safari en iPhone/iPad, Chrome en Android y cualquier navegador de escritorio en Windows o Mac.",
      },
    ];
  }

  if (locale === "ru") {
    return [
      {
        q: `Насколько безопасно использовать инструмент «${toolName}${modLabel}»?`,
        a: `Обработка полностью выполняется локально в оперативной памяти вашего устройства с помощью WebAssembly и HTML5 Canvas. Файлы никуда не загружаются и не сохраняются на серверах.`,
      },
      {
        q: mod?.targetKb
          ? `Как гарантированно уменьшить размер файла до ${mod.targetKb} КБ?`
          : "Есть ли ограничения по размеру файла или количеству страниц?",
        a: mod?.targetKb
          ? `Выберите режим «Максимальное сжатие» или «Рекомендуемое» — алгоритм оптимизирует встроенные изображения и потоки объектов, чтобы уложиться в лимит ${mod.targetKb} КБ.`
          : "Искусственных ограничений нет. Вы можете бесплатно обрабатывать многостраничные документы любого объёма, который поддерживает память вашего устройства.",
      },
      {
        q: "Добавляются ли водяные знаки на готовый документ?",
        a: "Нет. Все экспортируемые файлы полностью чистые, без логотипов и водяных знаков.",
      },
      {
        q: "Работает ли инструмент на телефонах Android и iPhone?",
        a: "Да, приложение полностью адаптировано для мобильных браузеров Safari (iOS), Chrome (Android) и настольных систем Windows и macOS.",
      },
    ];
  }

  if (locale === "ar") {
    return [
      {
        q: `هل أداة ${toolName}${modLabel} آمنة ومجانية بالكامل؟`,
        a: `نعم، تتم عملية ${actionText}${modLabel} محلياً بنسبة 100% داخل ذاكرة المتصفح باستخدام تقنيات WebAssembly و HTML5 Canvas دون رفع أي بايت إلى خوادم خارجية.`,
      },
      {
        q: mod?.targetKb
          ? `كيف يمكنني تقليل حجم الملف إلى أقل من ${mod.targetKb} كيلوبايت؟`
          : "هل توجد قيود على حجم الملف أو عدد الصفحات؟",
        a: mod?.targetKb
          ? `اختر مستوى "ضغط أقصى" أو "موصى به" لإعادة تحسين الصور المدمجة وإزالة البيانات الزائدة للوصول إلى أقل من ${mod.targetKb} كيلوبايت مع الحفاظ على وضوح النص.`
          : "لا توجد أي قيود اصطناعية؛ يمكنك معالجة الملفات الكبيرة ومتعددة الصفحات مجاناً طالما تتوفر ذاكرة كافية على جهازك.",
      },
      {
        q: "هل يضيف الموقع علامات مائية على الملفات الناتجة؟",
        a: "أبداً. جميع المستندات الناتجة نظيفة تماماً وبدون أي علامة مائية وجاهزة للتقديم الرسمي.",
      },
      {
        q: "هل يمكن استخدام الأداة على الهواتف الذكية والأجهزة اللوحية؟",
        a: "نعم، الأداة متوافقة بالكامل مع متصفحات Safari على iPhone و iPad ومتصفح Chrome على هواتف Android وأجهزة الحاسوب.",
      },
    ];
  }

  return [
    {
      q: `Is this ${toolName}${modLabel} tool completely free and private?`,
      a: `Yes. Everything runs 100% locally inside your browser RAM using WebAssembly and HTML5 Canvas so you can ${actionText}${modLabel} with zero server uploads.`,
    },
    {
      q: mod?.targetKb
        ? `How does the tool reach the under-${mod.targetKb} KB file size target?`
        : "Are there any file size or page count limitations?",
      a: mod?.targetKb
        ? `By combining metadata stripping, PDF object-stream packing, and configurable canvas DPI/JPEG re-encoding, you can reliably shrink documents toward your ${mod.targetKb} KB portal upload limit.`
        : "There are no artificial paywalls or page limits. As long as your device has available memory, you can process large multi-page documents freely.",
    },
    {
      q: "Will my downloaded document contain watermarks?",
      a: "Never. All exported PDFs and Office documents are clean, watermark-free, and compliant with ISO 32000-1 standards.",
    },
    {
      q: "Can I use this tool offline or on mobile devices?",
      a: "Yes. It works natively on iOS Safari, Android Chrome, macOS, and Windows—and continues functioning offline once loaded.",
    },
  ];
}

function buildPageRecord(
  tool: (typeof CORE_TOOLS)[0],
  mod: PseoModifier | undefined,
  locale: PseoLocale,
  slug: string
): PseoPageData {
  const toolName = tool.names[locale];
  const modLabel = mod ? ` ${mod[locale]}` : "";
  const actionText = tool.action[locale];

  let title = `${toolName}${modLabel} — Free & 100% Private | PDFStudio`;
  const h1 = `${toolName}${modLabel}`.trim();
  let metaDescription = `Free online tool to ${actionText}${modLabel}. 100% private client-side processing directly in your browser. Files never leave your device.`;

  if (locale === "fr") {
    title = `${toolName}${modLabel} — Gratuit & 100% Privé | PDFStudio`;
    metaDescription = `Outil en ligne gratuit pour ${actionText}${modLabel}. Traitement 100% local dans votre navigateur sans aucun envoi sur serveur.`;
  } else if (locale === "es") {
    title = `${toolName}${modLabel} — Gratis y 100% Privado | PDFStudio`;
    metaDescription = `Herramienta en línea gratuita para ${actionText}${modLabel}. Procesamiento 100% local en tu navegador con privacidad total.`;
  } else if (locale === "ru") {
    title = `${toolName}${modLabel} — Бесплатно и приватно | PDFStudio`;
    metaDescription = `Бесплатный онлайн-инструмент, чтобы ${actionText}${modLabel}. 100% локальная обработка в браузере без загрузки на сервер.`;
  } else if (locale === "ar") {
    title = `${toolName}${modLabel} — مجاني وخاص 100% | PDFStudio`;
    metaDescription = `أداة مجانية للقيام بـ ${actionText}${modLabel}. معالجة آمنة محلياً 100% داخل المتصفح دون رفع أي ملفات.`;
  }

  const benefits = getLocalizedBenefits(locale, toolName, mod);
  const steps = getLocalizedSteps(locale, toolName, mod);
  const faqs = getLocalizedFaqs(locale, toolName, actionText, mod);

  const prefix = locale === "en" ? "" : `/${locale}`;

  const relatedSlugs = CORE_TOOLS.filter((t) => t.type !== tool.type)
    .slice(0, 8)
    .map((t) => ({
      href: `${prefix}/${t.baseSlug}`,
      label: t.names[locale],
    }));

  // Build internal links to compatible modifier variations for this tool so zero pSEO pages are orphaned
  const compatibleMods = MODIFIERS.filter((m) => isModifierCompatible(tool.type, m));
  const variationLinks = [
    ...(mod
      ? [
          {
            href: `${prefix}/${tool.baseSlug}`,
            label: toolName,
          },
        ]
      : []),
    ...compatibleMods
      .filter((m) => m.id !== mod?.id)
      .slice(0, 14)
      .map((m) => ({
        href: `${prefix}/${buildPseoSlug(tool.baseSlug, m.id)}`,
        label: `${toolName} ${m[locale]}`,
      })),
  ];

  return {
    slug,
    locale,
    toolType: tool.type,
    baseSlug: tool.baseSlug,
    modifierId: mod?.id,
    modifierCategory: mod?.category,
    targetKb: mod?.targetKb,
    title,
    h1,
    metaDescription,
    intro: metaDescription,
    benefits,
    steps,
    faqs,
    relatedSlugs,
    variationLinks,
  };
}
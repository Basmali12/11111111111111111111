export const PYTHON_MAIN_CODE = `"""
نظام إدارة وسطح مكتب متطور باستخدام CustomTkinter - المرحلة الخامسة
Modern Desktop App built with CustomTkinter & Python (Phase 5 - Full CRUD)

المميزات في هذه النسخة (المرحلة 5: دورة CRUD كاملة):
1. زر إضافة منتسب جديد (Add Personnel Button): زر بارز في الشاشة الرئيسية بجانب شريط البحث لفتح نافذة الإضافة.
2. نافذة الإضافة (Add Window): استخدام نفس النافذة المنبثقة CTkToplevel ذات التبويبات الـ 5 والـ 61 حقلاً، مع إفراغ جميع الحقول وتخصيص العنوان.
3. حفظ المنتسب الجديد (Auto-increment Seq & Save): إنشاء تسلسل جديد تلقائياً (أعلى رقم 'ت' + 1)، إضافة السجل للـ DataFrame في الذاكرة، إدراجه فوراً في جدول Treeview، وتصديره لملف الإكسل الأصلي.
4. زر حذف منتسب (Delete Personnel Button): زر أحمر هادئ أنيق في نافذة التفاصيل وفي شريط الأدوات الرئيسي لحذف المنتسب المحدد.
5. تأكيد الحذف (Confirmation Dialog): رسالة تأكيد تحذيرية 'هل أنت متأكد من حذف بيانات هذا المنتسب نهائياً؟' تدعم CTkMessagebox.
6. تنفيذ الحذف الفوري (Execute Delete): حذف الصف من DataFrame، حذفه من جدول Treeview، والحفظ التلقائي في ملف الإكسل الأصلي مع معالجة أخطاء الملفات المفتوحة.
"""

import os
import sys
import json
import shutil
from pathlib import Path
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import customtkinter as ctk
import pandas as pd

# محاولة استيراد CTkMessagebox إذا كانت متوفرة في البيئة
try:
    from CTkMessagebox import CTkMessagebox
    HAS_CTK_MESSAGEBOX = True
except ImportError:
    HAS_CTK_MESSAGEBOX = False

# ==============================================================================
# مخطط الـ 61 عموداً وتوزيعها على التبويبات الخمسة (61-Columns Schema)
# ==============================================================================

TAB_FIELDS_SCHEMA = {
    "المعلومات الشخصية": [
        ("ت", "الرقم التسلسلي العام (ت)"),
        ("الاسم الرباعي واللقب", "الاسم الرباعي واللقب الكامل"),
        ("الاسم الأول", "الاسم الأول"),
        ("اسم الأب", "اسم الأب"),
        ("اسم الجد", "اسم الجد"),
        ("اسم والد الجد", "اسم والد الجد"),
        ("اللقب والعشيرة", "اللقب أو العشيرة"),
        ("اسم الأم الثلاثي", "اسم الأم الثلاثي"),
        ("تاريخ الميلاد", "تاريخ الميلاد (يوم/شهر/سنة)"),
        ("محل الولادة", "محل الولادة (المحافظة/القضاء)"),
        ("فصيلة الدم", "فصيلة الدم"),
        ("الديانة", "الديانة"),
        ("القومية", "القومية")
    ],
    "المستندات الثبوتية": [
        ("نوع الهوية", "نوع الهوية الرسمية"),
        ("رقم البطاقة الوطنية", "رقم البطاقة الوطنية / الهوية"),
        ("جهة إصدار الهوية", "دائرة وأحوال الإصدار"),
        ("تاريخ إصدار الهوية", "تاريخ إصدار الهوية"),
        ("رقم الصحيفة", "رقم الصحيفة"),
        ("رقم السجل", "رقم السجل"),
        ("رقم شهادة الجنسية", "رقم شهادة الجنسية"),
        ("جهة إصدار شهادة الجنسية", "جهة إصدار الشهادة"),
        ("رقم جواز السفر", "رقم جواز السفر"),
        ("تاريخ نفاذ الجواز", "تاريخ نفاذ الجواز"),
        ("رقم بطاقة السكن", "رقم بطاقة السكن"),
        ("مكتب معلومات السكن", "مكتب معلومات السكن")
    ],
    "السكن والاتصال": [
        ("محافظة السكن الحالية", "محافظة السكن الحالية"),
        ("القضاء والناحية", "القضاء / الناحية"),
        ("اسم الحي والمنطقة", "اسم الحي والمنطقة"),
        ("المحلة والزقاق والدار", "المحلة / الزقاق / الدار"),
        ("أقرب نقطة دالة", "أقرب نقطة دالة"),
        ("رقم الهاتف الأساسي", "رقم الهاتف الأساسي"),
        ("رقم الهاتف البديل", "رقم الهاتف البديل (واتساب)"),
        ("رقم هاتف الطوارئ", "رقم هاتف أحد الأقارب (طوارئ)"),
        ("درجة قرابة الطوارئ", "درجة قرابة جهة الطوارئ"),
        ("البريد الإلكتروني", "البريد الإلكتروني"),
        ("محل السكن الأصلي", "محل السكن الأصلي"),
        ("عنوان سكن ولي الأمر", "عنوان سكن ولي الأمر")
    ],
    "الحالة الاجتماعية": [
        ("الحالة الاجتماعية", "الحالة الاجتماعية"),
        ("اسم الزوجة الرباعي", "اسم الزوجة الرباعي"),
        ("عمل الزوجة", "عمل / مهنة الزوجة"),
        ("عدد الأبناء الذكور", "عدد الأبناء (الذكور)"),
        ("عدد البنات الإناث", "عدد البنات (الإناث)"),
        ("مجموع الأفراد المعالين", "مجموع الأفراد المعالين"),
        ("صلة الإعالة", "صلة الإعالة المباشرة"),
        ("محل سكن عائلة المنتسب", "محل سكن عائلة المنتسب"),
        ("اسم المعيل البديل", "اسم المعيل البديل في الطوارئ"),
        ("رقم البطاقة التموينية", "رقم البطاقة التموينية"),
        ("اسم مركز التموين", "اسم مركز والوكيل التمويني")
    ],
    "الخدمة العسكرية والصحية": [
        ("الرقم العسكري", "الرقم العسكري المعتمد"),
        ("الرتبة العسكرية", "الرتبة الحالية"),
        ("الصنف والاختصاص", "الصنف والاختصاص الدقيق"),
        ("المنصب الحالي", "المنصب أو العنوان الوظيفي"),
        ("الوحدة واللواء والفوج", "التشكيل العسكري والوحدة"),
        ("تاريخ التطوع والتعيين", "تاريخ التطوع والالتحاق"),
        ("تاريخ الترقية الأخيرة", "تاريخ الترقية الأخيرة"),
        ("أشهر القدم الممتاز", "أشهر القدم الممتاز الممنوحة"),
        ("الموقف العسكري الحالي", "الموقف العسكري (مستمر/مجاز)"),
        ("الدورات العسكرية الحاصل عليها", "الدورات العسكرية الحاصل عليها"),
        ("الحالة الصحية العامة", "الحالة الصحية العامة"),
        ("الصنف الطبي العسكري", "الصنف الطبي العسكري (اللياقة)"),
        ("ملاحظات الخدمة والإصابات", "ملاحظات الخدمة وإصابات العمل")
    ]
}

ALL_61_COLUMNS = [col_key for tab_cols in TAB_FIELDS_SCHEMA.values() for col_key, _ in tab_cols]

CONFIG_FILE = Path(__file__).resolve().parent / ".config.json"

DEFAULT_CONFIG = {
    "appearance_mode": "Dark",
    "color_theme": "blue",
    "default_save_path": str(Path.home() / "Documents" / "AppExports"),
    "database_filename": "database.xlsx"
}


def load_config() -> dict:
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                config = DEFAULT_CONFIG.copy()
                config.update(data)
                return config
        except Exception as e:
            print(f"تحذير: تعذر قراءة ملف الإعدادات ({e})، سيتم استخدام الإعدادات الافتراضية.")
            return DEFAULT_CONFIG.copy()
    else:
        save_config(DEFAULT_CONFIG)
        return DEFAULT_CONFIG.copy()


def save_config(config_data: dict) -> bool:
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(config_data, f, ensure_ascii=False, indent=4)
        return True
    except Exception as e:
        print(f"خطأ أثناء حفظ ملف الإعدادات: {e}")
        return False


def normalize_arabic(text) -> str:
    if text is None or pd.isna(text):
        return ""
    text_str = str(text).strip()
    text_str = text_str.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")
    text_str = text_str.replace("ى", "ي").replace("ة", "ه")
    return text_str.lower()


def show_app_message(title: str, message: str, icon: str = "check", parent=None):
    if HAS_CTK_MESSAGEBOX:
        try:
            CTkMessagebox(
                title=title,
                message=message,
                icon=icon,
                option_1="موافق"
            )
            return
        except Exception:
            pass

    if icon in ("check", "info"):
        messagebox.showinfo(title, message, parent=parent)
    elif icon == "warning":
        messagebox.showwarning(title, message, parent=parent)
    else:
        messagebox.showerror(title, message, parent=parent)


class PersonnelDetailWindow(ctk.CTkToplevel):
    def __init__(self, parent, record_series: pd.Series | None, font_family: str, is_add_mode: bool = False):
        super().__init__(parent)

        self.parent = parent
        self.is_add_mode = is_add_mode
        self.record = record_series if record_series is not None else pd.Series(dtype=object)
        self.font_family = font_family
        self.entries = {}

        if self.is_add_mode:
            fullname = "إضافة منتسب جديد"
            military_id = "سجل جديد"
            rank = "تسجيل"
            self.title("إضافة منتسب جديد إلى قاعدة البيانات")
        else:
            fullname = str(self.record.get("الاسم الرباعي واللقب", "تفاصيل المنتسب"))
            military_id = str(self.record.get("الرقم العسكري", "-"))
            rank = str(self.record.get("الرتبة العسكرية", ""))
            self.title(f"ملف المنتسب: {fullname} (الرقم العسكري: {military_id})")

        window_width = 1040
        window_height = 740
        self.minsize(860, 580)

        screen_w = self.winfo_screenwidth()
        screen_h = self.winfo_screenheight()
        center_x = max(20, (screen_w - window_width) // 2)
        center_y = max(20, (screen_h - window_height) // 2)
        self.geometry(f"{window_width}x{window_height}+{center_x}+{center_y}")

        self.after(100, self.lift)
        self.focus_set()

        self.font_title = ctk.CTkFont(family=self.font_family, size=17, weight="bold")
        self.font_label = ctk.CTkFont(family=self.font_family, size=12, weight="bold")
        self.font_entry = ctk.CTkFont(family=self.font_family, size=12)
        self.font_btn = ctk.CTkFont(family=self.font_family, size=13, weight="bold")
        self.font_tab = ctk.CTkFont(family=self.font_family, size=13, weight="bold")

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        self._build_header_card(fullname, military_id, rank)
        self._build_tabview()
        self._build_footer()

    def _build_header_card(self, fullname: str, military_id: str, rank: str):
        header_frame = ctk.CTkFrame(self, corner_radius=12, fg_color=("gray92", "gray17"))
        header_frame.grid(row=0, column=0, sticky="ew", padx=18, pady=(16, 10))
        header_frame.grid_columnconfigure(1, weight=1)

        icon_char = "➕" if self.is_add_mode else "🎖️"
        icon_box = ctk.CTkLabel(header_frame, text=icon_char, font=ctk.CTkFont(family=self.font_family, size=32))
        icon_box.grid(row=0, column=0, rowspan=2, padx=(18, 12), pady=12)

        if self.is_add_mode:
            title_text = "تسجيل وإضافة منتسب جديد"
            sub_text = "املأ الحقول في التبويبات الخمسة ثم اضغط 'حفظ المنتسب الجديد' لإنشاء التسلسل التلقائي والتصدير للإكسل."
        else:
            title_text = f"{rank} / {fullname}" if rank and rank != "-" else fullname
            position_text = str(self.record.get("المنصب الحالي", "-"))
            unit_text = str(self.record.get("الوحدة واللواء والفوج", "-"))
            sub_text = f"الرقم العسكري: {military_id}  |  المنصب: {position_text}  |  الوحدة: {unit_text}"

        lbl_name = ctk.CTkLabel(header_frame, text=title_text, font=self.font_title, anchor="e")
        lbl_name.grid(row=0, column=1, sticky="e", padx=(0, 20), pady=(12, 2))

        lbl_sub = ctk.CTkLabel(
            header_frame,
            text=sub_text,
            font=ctk.CTkFont(family=self.font_family, size=12),
            text_color=("gray40", "gray65"),
            anchor="e"
        )
        lbl_sub.grid(row=1, column=1, sticky="e", padx=(0, 20), pady=(0, 12))

    def _build_tabview(self):
        self.tabview = ctk.CTkTabview(self, corner_radius=14)
        self.tabview.grid(row=1, column=0, sticky="nsew", padx=18, pady=(0, 10))

        tabs_order = [
            "المعلومات الشخصية",
            "المستندات الثبوتية",
            "السكن والاتصال",
            "الحالة الاجتماعية",
            "الخدمة العسكرية والصحية"
        ]

        for tab_name in tabs_order:
            self.tabview.add(tab_name)
            tab_frame = self.tabview.tab(tab_name)
            tab_frame.grid_columnconfigure(0, weight=1)
            tab_frame.grid_rowconfigure(0, weight=1)

            scroll_frame = ctk.CTkScrollableFrame(tab_frame, corner_radius=10, fg_color="transparent")
            scroll_frame.grid(row=0, column=0, sticky="nsew", padx=8, pady=8)
            scroll_frame.grid_columnconfigure((0, 1), weight=1, uniform="equal_cols")

            fields_list = TAB_FIELDS_SCHEMA.get(tab_name, [])

            for idx, (col_key, display_label) in enumerate(fields_list):
                row_idx = idx // 2
                col_idx = idx % 2

                field_card = ctk.CTkFrame(scroll_frame, corner_radius=8, fg_color=("gray88", "gray21"))
                field_card.grid(row=row_idx, column=col_idx, sticky="ew", padx=7, pady=6)
                field_card.grid_columnconfigure(0, weight=1)

                lbl = ctk.CTkLabel(
                    field_card,
                    text=f"{display_label}:",
                    font=self.font_label,
                    text_color=("gray20", "gray85"),
                    anchor="e"
                )
                lbl.pack(fill="x", padx=12, pady=(8, 2))

                entry = ctk.CTkEntry(
                    field_card,
                    font=self.font_entry,
                    height=34,
                    corner_radius=7,
                    border_width=1,
                    justify="right"
                )
                entry.pack(fill="x", padx=12, pady=(0, 10))

                if self.is_add_mode:
                    val_str = ""
                    if col_key == "ت":
                        entry.configure(placeholder_text="(تلقائي عند الحفظ)")
                else:
                    raw_value = self.record.get(col_key, "")
                    if pd.notna(raw_value) and str(raw_value).strip().lower() != "nan":
                        val_str = str(raw_value).strip()
                    else:
                        val_str = ""
                    entry.insert(0, val_str)

                self.entries[col_key] = entry

    def _build_footer(self):
        footer_frame = ctk.CTkFrame(self, fg_color="transparent")
        footer_frame.grid(row=2, column=0, sticky="ew", padx=18, pady=(6, 14))

        hint_text = "💡 في وضع الإضافة يتم توليد أعلى رقم تسلسلي (ت) تلقائياً والحفظ الفوري في الإكسل." if self.is_add_mode else "💡 عند الحفظ أو الحذف، يتم تحديث الذاكرة فورياً والجدول وحفظ ملف الإكسل الأصلي."
        lbl_info = ctk.CTkLabel(
            footer_frame,
            text=hint_text,
            font=ctk.CTkFont(family=self.font_family, size=11),
            text_color=("gray45", "gray60")
        )
        lbl_info.pack(side="right", padx=10)

        btn_box = ctk.CTkFrame(footer_frame, fg_color="transparent")
        btn_box.pack(side="left")

        save_btn_title = "💾  حفظ المنتسب الجديد" if self.is_add_mode else "💾  حفظ التغييرات"
        self.btn_save = ctk.CTkButton(
            btn_box,
            text=save_btn_title,
            font=self.font_btn,
            height=40,
            width=165 if self.is_add_mode else 145,
            corner_radius=10,
            fg_color=("#107C41", "#107C41"),
            hover_color=("#0B5A2F", "#0B5A2F"),
            command=self.save_changes
        )
        self.btn_save.pack(side="left", padx=(0, 8))

        if not self.is_add_mode:
            self.btn_delete = ctk.CTkButton(
                btn_box,
                text="🗑️  حذف المنتسب",
                font=self.font_btn,
                height=40,
                width=130,
                corner_radius=10,
                fg_color=("#c53030", "#991b1b"),
                hover_color=("#991b1b", "#7f1d1d"),
                text_color="#ffffff",
                command=self.confirm_and_delete
            )
            self.btn_delete.pack(side="left", padx=(0, 8))

        self.btn_close = ctk.CTkButton(
            btn_box,
            text="إلغاء وإغلاق",
            font=self.font_btn,
            height=40,
            width=100,
            corner_radius=10,
            fg_color=("gray75", "gray30"),
            hover_color=("gray65", "gray40"),
            text_color=("black", "white"),
            command=self.destroy
        )
        self.btn_close.pack(side="left")

    def save_changes(self):
        updated_values = {}
        for col_key, entry in self.entries.items():
            updated_values[col_key] = entry.get().strip()

        if self.is_add_mode and not updated_values.get("الاسم الرباعي واللقب", ""):
            show_app_message("تنبيه", "يرجى كتابة 'الاسم الرباعي واللقب' على الأقل لإضافة المنتسب.", "warning", self)
            return

        try:
            success = self.parent.save_record_and_update_all(
                self.record,
                updated_values,
                is_add_mode=self.is_add_mode
            )
            if success:
                msg_text = "تمت إضافة المنتسب الجديد بنجاح!\n\nتم تحديث الذاكرة والجدول وتصدير ملف Excel." if self.is_add_mode else "تم حفظ التعديلات بنجاح!\n\nتم تحديث الذاكرة وتحديث الجدول الرئيسي وتصدير ملف Excel."
                show_app_message(
                    title="تم الحفظ بنجاح",
                    message=msg_text,
                    icon="check",
                    parent=self.parent
                )
                self.destroy()
        except PermissionError:
            pass
        except Exception as e:
            show_app_message(
                title="خطأ في الحفظ",
                message=f"تعذر استكمال حفظ البيانات:\n{e}",
                icon="cancel",
                parent=self
            )

    def confirm_and_delete(self):
        fullname = str(self.record.get("الاسم الرباعي واللقب", "هذا المنتسب"))
        mil_id = str(self.record.get("الرقم العسكري", "-"))

        confirm = False
        if HAS_CTK_MESSAGEBOX:
            msg = CTkMessagebox(
                title="تأكيد الحذف",
                message=f"هل أنت متأكد من حذف بيانات هذا المنتسب نهائياً؟\n\nالاسم: {fullname}\nالرقم العسكري: {mil_id}",
                icon="warning",
                option_1="إلغاء",
                option_2="نعم، حذف نهائي"
            )
            confirm = (msg.get() == "نعم، حذف نهائي")
        else:
            confirm = messagebox.askyesno(
                "تأكيد الحذف",
                f"هل أنت متأكد من حذف بيانات هذا المنتسب نهائياً؟\n\nالاسم: {fullname}\nالرقم العسكري: {mil_id}",
                parent=self
            )

        if not confirm:
            return

        try:
            success = self.parent.delete_record_and_save(self.record)
            if success:
                show_app_message(
                    "تم الحذف",
                    f"تم حذف بيانات المنتسب '{fullname}' نهائياً بنجاح وتحديث ملف الإكسل.",
                    "check",
                    self.parent
                )
                self.destroy()
        except Exception as e:
            show_app_message("خطأ في الحذف", f"تعذر إتمام عملية الحذف:\n{e}", "error", self)


class ModernApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.config = load_config()
        self.df: pd.DataFrame | None = None
        self.active_db_path: Path | None = None
        self.detail_window: PersonnelDetailWindow | None = None

        saved_mode = self.config.get("appearance_mode", "Dark")
        ctk.set_appearance_mode(saved_mode)
        ctk.set_default_color_theme(self.config.get("color_theme", "blue"))

        self.title("نظام إدارة السجلات وقواعد البيانات - Modern CustomTkinter Suite")
        self.geometry("1180x700")
        self.minsize(920, 580)

        self.font_family = "Segoe UI" if sys.platform == "win32" else "Cairo"
        self.font_title = ctk.CTkFont(family=self.font_family, size=19, weight="bold")
        self.font_subtitle = ctk.CTkFont(family=self.font_family, size=14, weight="bold")
        self.font_body = ctk.CTkFont(family=self.font_family, size=13)
        self.font_btn = ctk.CTkFont(family=self.font_family, size=13, weight="bold")
        self.font_counter = ctk.CTkFont(family=self.font_family, size=12)

        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        self.style = ttk.Style(self)
        self._apply_treeview_styling(saved_mode)

        self._build_sidebar()
        self._build_content_frames()
        self._check_and_autoload_database()
        self.select_view("home")

    def _apply_treeview_styling(self, mode: str):
        is_dark = mode.lower() == "dark"
        try:
            self.style.theme_use("clam")
        except Exception:
            pass

        if is_dark:
            bg_color, fg_color = "#1f1f1f", "#f3f4f6"
            heading_bg, heading_fg = "#292929", "#ffffff"
            selected_bg, alt_row_bg = "#1f538d", "#262626"
        else:
            bg_color, fg_color = "#ffffff", "#111827"
            heading_bg, heading_fg = "#f3f4f6", "#111827"
            selected_bg, alt_row_bg = "#3b8ed0", "#f9fafb"

        self.style.configure(
            "Custom.Treeview",
            background=bg_color,
            foreground=fg_color,
            fieldbackground=bg_color,
            rowheight=36,
            borderwidth=0,
            font=(self.font_family, 11)
        )
        self.style.configure(
            "Custom.Treeview.Heading",
            background=heading_bg,
            foreground=heading_fg,
            relief="flat",
            font=(self.font_family, 11, "bold"),
            padding=(8, 8)
        )
        self.style.map("Custom.Treeview", background=[("selected", selected_bg)], foreground=[("selected", "#ffffff")])
        self.style.map("Custom.Treeview.Heading", background=[("active", heading_bg)])

        self.tree_row_colors = (bg_color, alt_row_bg)
        if hasattr(self, "tree"):
            self.tree.tag_configure("evenrow", background=self.tree_row_colors[0])
            self.tree.tag_configure("oddrow", background=self.tree_row_colors[1])

    def _build_sidebar(self):
        self.sidebar_frame = ctk.CTkFrame(self, width=230, corner_radius=16, fg_color=("gray90", "gray14"))
        self.sidebar_frame.grid(row=0, column=0, sticky="nsew", padx=(14, 7), pady=14)
        self.sidebar_frame.grid_rowconfigure(4, weight=1)

        self.logo_label = ctk.CTkLabel(self.sidebar_frame, text="⚡ نظام الإدارة الذكي", font=self.font_title)
        self.logo_label.grid(row=0, column=0, padx=20, pady=(24, 6))

        self.sub_logo = ctk.CTkLabel(
            self.sidebar_frame,
            text="CustomTkinter Database Suite",
            font=ctk.CTkFont(family=self.font_family, size=10),
            text_color=("gray40", "gray60")
        )
        self.sub_logo.grid(row=1, column=0, padx=20, pady=(0, 20))

        self.btn_home = ctk.CTkButton(
            self.sidebar_frame,
            text="🏠  الرئيسية",
            font=self.font_btn,
            height=44,
            corner_radius=12,
            anchor="e",
            command=lambda: self.select_view("home")
        )
        self.btn_home.grid(row=2, column=0, padx=14, pady=6, sticky="ew")

        self.btn_settings = ctk.CTkButton(
            self.sidebar_frame,
            text="⚙️  الإعدادات",
            font=self.font_btn,
            height=44,
            corner_radius=12,
            anchor="e",
            command=lambda: self.select_view("settings")
        )
        self.btn_settings.grid(row=3, column=0, padx=14, pady=6, sticky="ew")

        self.theme_container = ctk.CTkFrame(self.sidebar_frame, corner_radius=12, fg_color=("gray82", "gray20"))
        self.theme_container.grid(row=5, column=0, padx=14, pady=16, sticky="ew")

        current_mode = self.config.get("appearance_mode", "Dark")
        is_dark = current_mode.lower() == "dark"

        self.theme_switch = ctk.CTkSwitch(
            self.theme_container,
            text="الوضع الداكن",
            font=self.font_body,
            command=self.toggle_appearance_mode,
            onvalue=1,
            offvalue=0
        )
        if is_dark:
            self.theme_switch.select()
        else:
            self.theme_switch.deselect()
        self.theme_switch.pack(padx=16, pady=12)

    def _build_content_frames(self):
        self.home_frame = ctk.CTkFrame(self, corner_radius=16, fg_color=("white", "gray17"))
        self._build_home_view()

        self.settings_frame = ctk.CTkFrame(self, corner_radius=16, fg_color=("white", "gray17"))
        self._build_settings_view()

    def _build_home_view(self):
        self.home_frame.grid_columnconfigure(0, weight=1)
        self.home_frame.grid_rowconfigure(2, weight=1)

        top_bar = ctk.CTkFrame(self.home_frame, fg_color="transparent")
        top_bar.grid(row=0, column=0, sticky="ew", padx=24, pady=(18, 4))
        top_bar.grid_columnconfigure(0, weight=1)

        title_box = ctk.CTkFrame(top_bar, fg_color="transparent")
        title_box.grid(row=0, column=0, sticky="e")

        self.home_title = ctk.CTkLabel(title_box, text="سجل البيانات وقاعدة المنتسبين", font=self.font_title)
        self.home_title.pack(anchor="e")

        self.home_hint = ctk.CTkLabel(
            title_box,
            text="💡 انقر نقراً مزدوجاً (Double Click) على اسم أي منتسب لتعديله وحفظه أو حذفه، أو اضغط 'إضافة منتسب جديد'.",
            font=ctk.CTkFont(family=self.font_family, size=11),
            text_color=("gray40", "gray65")
        )
        self.home_hint.pack(anchor="e", pady=(2, 0))

        search_row = ctk.CTkFrame(self.home_frame, fg_color="transparent")
        search_row.grid(row=1, column=0, sticky="ew", padx=24, pady=(6, 10))
        search_row.grid_columnconfigure(0, weight=1)

        self.search_var = tk.StringVar()
        self.search_var.trace_add("write", self._on_search_query_changed)

        self.entry_search = ctk.CTkEntry(
            search_row,
            placeholder_text="🔍  ابحث فوراً بالرقم العسكري أو الاسم الرباعي واللقب...",
            font=self.font_body,
            height=44,
            corner_radius=12,
            border_width=1,
            textvariable=self.search_var
        )
        self.entry_search.grid(row=0, column=0, sticky="ew", padx=(8, 0))

        self.btn_clear_search = ctk.CTkButton(
            search_row,
            text="مسح ✕",
            width=65,
            height=44,
            corner_radius=12,
            fg_color=("gray85", "gray25"),
            text_color=("gray20", "gray90"),
            hover_color=("gray75", "gray30"),
            font=self.font_counter,
            command=self._clear_search
        )
        self.btn_clear_search.grid(row=0, column=1, padx=(6, 0))

        # زر إضافة منتسب جديد (المرحلة 5)
        self.btn_add_personnel = ctk.CTkButton(
            search_row,
            text="➕  إضافة منتسب جديد",
            font=self.font_btn,
            height=44,
            corner_radius=12,
            fg_color=("#107C41", "#107C41"),
            hover_color=("#0B5A2F", "#0B5A2F"),
            command=self.open_add_personnel_window
        )
        self.btn_add_personnel.grid(row=0, column=2, padx=(8, 0))

        # زر حذف السجل المحدد في الجدول
        self.btn_delete_selected = ctk.CTkButton(
            search_row,
            text="🗑️  حذف المحدد",
            font=self.font_counter,
            height=44,
            width=100,
            corner_radius=12,
            fg_color=("#c53030", "#991b1b"),
            hover_color=("#991b1b", "#7f1d1d"),
            text_color="#ffffff",
            command=self.delete_selected_tree_record
        )
        self.btn_delete_selected.grid(row=0, column=3, padx=(6, 0))

        table_container = ctk.CTkFrame(self.home_frame, corner_radius=14, fg_color=("gray95", "gray20"))
        table_container.grid(row=2, column=0, sticky="nsew", padx=24, pady=(0, 10))
        table_container.grid_columnconfigure(0, weight=1)
        table_container.grid_rowconfigure(0, weight=1)

        self.columns = ("seq", "military_id", "fullname", "position", "phone")
        self.tree = ttk.Treeview(
            table_container,
            columns=self.columns,
            show="headings",
            style="Custom.Treeview",
            selectmode="browse"
        )

        headers = [
            ("seq", "ت", 60, "center"),
            ("military_id", "الرقم العسكري", 160, "center"),
            ("fullname", "الاسم الرباعي واللقب", 320, "e"),
            ("position", "المنصب", 220, "e"),
            ("phone", "رقم الهاتف", 170, "center")
        ]

        for col_id, text, width, anchor in headers:
            self.tree.heading(col_id, text=text, anchor=anchor)
            self.tree.column(col_id, width=width, minwidth=50, anchor=anchor)

        vsb = ttk.Scrollbar(table_container, orient="vertical", command=self.tree.yview)
        hsb = ttk.Scrollbar(table_container, orient="horizontal", command=self.tree.xview)
        self.tree.configure(yscrollcommand=vsb.set, xscrollcommand=hsb.set)

        self.tree.grid(row=0, column=0, sticky="nsew", padx=(10, 0), pady=10)
        vsb.grid(row=0, column=1, sticky="ns", pady=10, padx=(0, 10))
        hsb.grid(row=1, column=0, sticky="ew", padx=10, pady=(0, 10))

        self.tree.bind("<Double-1>", self.on_tree_double_click)
        self.tree.bind("<Return>", self.on_tree_double_click)

        self.empty_state_frame = ctk.CTkFrame(table_container, fg_color="transparent")
        self.lbl_empty_icon = ctk.CTkLabel(self.empty_state_frame, text="📂", font=ctk.CTkFont(family=self.font_family, size=46))
        self.lbl_empty_icon.pack(pady=(20, 5))

        self.lbl_empty_text = ctk.CTkLabel(self.empty_state_frame, text="لم يتم تحميل أي قاعدة بيانات بعد", font=self.font_subtitle)
        self.lbl_empty_text.pack(pady=4)

        self.lbl_empty_sub = ctk.CTkLabel(
            self.empty_state_frame,
            text="يمكنك استيراد قاعدة بيانات من الإعدادات، أو الضغط على 'إضافة منتسب جديد' لبدء بناء قاعدة البيانات.",
            font=ctk.CTkFont(family=self.font_family, size=12),
            text_color=("gray50", "gray50")
        )
        self.lbl_empty_sub.pack(pady=4)

        self.btn_empty_add = ctk.CTkButton(
            self.empty_state_frame,
            text="➕ إضافة أول منتسب الآن",
            font=self.font_btn,
            height=38,
            corner_radius=10,
            command=self.open_add_personnel_window
        )
        self.btn_empty_add.pack(pady=10)
        self.empty_state_frame.place(relx=0.5, rely=0.5, anchor="center")

        bottom_bar = ctk.CTkFrame(self.home_frame, fg_color="transparent")
        bottom_bar.grid(row=3, column=0, sticky="ew", padx=26, pady=(0, 16))

        self.lbl_status_counter = ctk.CTkLabel(
            bottom_bar,
            text="لا توجد سجلات محملة في الذاكرة",
            font=self.font_counter,
            text_color=("gray40", "gray60")
        )
        self.lbl_status_counter.pack(side="right")

        self.lbl_db_info = ctk.CTkLabel(bottom_bar, text="", font=self.font_counter, text_color=("gray50", "gray50"))
        self.lbl_db_info.pack(side="left")

    def open_add_personnel_window(self):
        if self.df is None:
            self.df = pd.DataFrame(columns=ALL_61_COLUMNS + ["_search_name", "_search_mil"])

        if self.detail_window is not None and self.detail_window.winfo_exists():
            self.detail_window.destroy()

        self.detail_window = PersonnelDetailWindow(
            self,
            record_series=None,
            font_family=self.font_family,
            is_add_mode=True
        )

    def on_tree_double_click(self, event=None):
        selected_items = self.tree.selection()
        if not selected_items:
            return

        item_id = selected_items[0]
        row_values = self.tree.item(item_id, "values")
        if not row_values or len(row_values) < 2:
            return

        seq_val = str(row_values[0]).strip()
        mil_id_val = str(row_values[1]).strip()

        if self.df is None or self.df.empty:
            show_app_message("تنبيه", "لا توجد قاعدة بيانات محملة في الذاكرة.", "warning", self)
            return

        matched_row = None
        if "ت" in self.df.columns and seq_val:
            matches = self.df[self.df["ت"].astype(str).str.strip() == seq_val]
            if not matches.empty:
                matched_row = matches.iloc[0]

        if matched_row is None and "الرقم العسكري" in self.df.columns and mil_id_val:
            matches = self.df[self.df["الرقم العسكري"].astype(str).str.strip() == mil_id_val]
            if not matches.empty:
                matched_row = matches.iloc[0]

        if matched_row is None:
            try:
                idx = int(seq_val) - 1
                if 0 <= idx < len(self.df):
                    matched_row = self.df.iloc[idx]
            except Exception:
                pass

        if matched_row is None:
            show_app_message("تنبيه", "تعذر العثور على السجل الكامل لهذا المنتسب في الذاكرة.", "warning", self)
            return

        if self.detail_window is not None and self.detail_window.winfo_exists():
            self.detail_window.destroy()

        self.detail_window = PersonnelDetailWindow(
            self,
            matched_row,
            self.font_family,
            is_add_mode=False
        )

    def save_record_and_update_all(self, old_record: pd.Series | None, updated_values: dict, is_add_mode: bool = False) -> bool:
        if self.df is None:
            self.df = pd.DataFrame(columns=ALL_61_COLUMNS + ["_search_name", "_search_mil"])

        if is_add_mode:
            new_seq = 1
            if "ت" in self.df.columns and not self.df.empty:
                try:
                    num_series = pd.to_numeric(self.df["ت"], errors="coerce").dropna()
                    if not num_series.empty:
                        new_seq = int(num_series.max()) + 1
                    else:
                        new_seq = len(self.df) + 1
                except Exception:
                    new_seq = len(self.df) + 1
            else:
                new_seq = len(self.df) + 1

            updated_values["ت"] = str(new_seq)

            new_row_data = {}
            for col in ALL_61_COLUMNS:
                new_row_data[col] = str(updated_values.get(col, "")).strip()

            new_row_data["_search_name"] = normalize_arabic(new_row_data.get("الاسم الرباعي واللقب", ""))
            new_row_data["_search_mil"] = str(new_row_data.get("الرقم العسكري", "")).strip().lower()

            new_df_row = pd.DataFrame([new_row_data])
            if self.df.empty:
                self.df = new_df_row
            else:
                self.df = pd.concat([self.df, new_df_row], ignore_index=True)

            if self.search_var.get().strip():
                self._on_search_query_changed()
            else:
                self._populate_table(self.df)
        else:
            orig_seq = str(old_record.get("ت", "")).strip() if old_record is not None else ""
            orig_mil = str(old_record.get("الرقم العسكري", "")).strip() if old_record is not None else ""

            target_idx = None
            if "ت" in self.df.columns and orig_seq:
                matches = self.df.index[self.df["ت"].astype(str).str.strip() == orig_seq].tolist()
                if matches:
                    target_idx = matches[0]

            if target_idx is None and "الرقم العسكري" in self.df.columns and orig_mil:
                matches = self.df.index[self.df["الرقم العسكري"].astype(str).str.strip() == orig_mil].tolist()
                if matches:
                    target_idx = matches[0]

            if target_idx is None:
                raise ValueError("تعذر العثور على سجل المنتسب المطابق في الذاكرة.")

            for col_name, val in updated_values.items():
                if col_name not in self.df.columns:
                    self.df[col_name] = ""
                self.df.at[target_idx, col_name] = val

            if "الاسم الرباعي واللقب" in updated_values:
                self.df.at[target_idx, "_search_name"] = normalize_arabic(updated_values["الاسم الرباعي واللقب"])
            if "الرقم العسكري" in updated_values:
                self.df.at[target_idx, "_search_mil"] = str(updated_values["الرقم العسكري"]).strip().lower()

            new_seq = str(updated_values.get("ت", orig_seq))
            new_mil = str(updated_values.get("الرقم العسكري", orig_mil))
            new_name = str(updated_values.get("الاسم الرباعي واللقب", "-"))
            new_pos = str(updated_values.get("المنصب الحالي", "-"))
            new_phone = str(updated_values.get("رقم الهاتف الأساسي", "-"))

            row_updated = False
            for item_id in self.tree.get_children():
                row_vals = self.tree.item(item_id, "values")
                if row_vals:
                    item_seq = str(row_vals[0]).strip()
                    item_mil = str(row_vals[1]).strip() if len(row_vals) > 1 else ""
                    if item_seq == orig_seq or (orig_mil and item_mil == orig_mil):
                        self.tree.item(
                            item_id,
                            values=(new_seq, new_mil, new_name, new_pos, new_phone)
                        )
                        row_updated = True
                        break

            if self.search_var.get().strip():
                self._on_search_query_changed()
            elif not row_updated:
                self._populate_table(self.df)

        self._auto_save_to_excel()
        return True

    def delete_record_and_save(self, record_series: pd.Series) -> bool:
        if self.df is None or self.df.empty:
            raise ValueError("لا توجد بيانات محملة في الذاكرة لحذفها.")

        orig_seq = str(record_series.get("ت", "")).strip()
        orig_mil = str(record_series.get("الرقم العسكري", "")).strip()

        target_idx = None
        if "ت" in self.df.columns and orig_seq:
            matches = self.df.index[self.df["ت"].astype(str).str.strip() == orig_seq].tolist()
            if matches:
                target_idx = matches[0]

        if target_idx is None and "الرقم العسكري" in self.df.columns and orig_mil:
            matches = self.df.index[self.df["الرقم العسكري"].astype(str).str.strip() == orig_mil].tolist()
            if matches:
                target_idx = matches[0]

        if target_idx is None:
            raise ValueError("تعذر العثور على سجل المنتسب في الذاكرة لحذفه.")

        self.df = self.df.drop(index=target_idx).reset_index(drop=True)

        if self.search_var.get().strip():
            self._on_search_query_changed()
        else:
            self._populate_table(self.df)

        self._auto_save_to_excel()
        return True

    def delete_selected_tree_record(self):
        selected_items = self.tree.selection()
        if not selected_items:
            show_app_message("تنبيه", "يرجى تحديد صف من الجدول أولاً لحذفه.", "warning", self)
            return

        item_id = selected_items[0]
        row_values = self.tree.item(item_id, "values")
        if not row_values or len(row_values) < 2:
            return

        seq_val = str(row_values[0]).strip()
        mil_val = str(row_values[1]).strip()
        fullname_val = str(row_values[2]).strip()

        confirm = False
        if HAS_CTK_MESSAGEBOX:
            msg = CTkMessagebox(
                title="تأكيد الحذف",
                message=f"هل أنت متأكد من حذف بيانات هذا المنتسب نهائياً؟\n\nالاسم: {fullname_val}\nالرقم العسكري: {mil_val}",
                icon="warning",
                option_1="إلغاء",
                option_2="نعم، حذف نهائي"
            )
            confirm = (msg.get() == "نعم، حذف نهائي")
        else:
            confirm = messagebox.askyesno(
                "تأكيد الحذف",
                f"هل أنت متأكد من حذف بيانات هذا المنتسب نهائياً؟\n\nالاسم: {fullname_val}\nالرقم العسكري: {mil_val}",
                parent=self
            )

        if not confirm:
            return

        matched_row = None
        if "ت" in self.df.columns and seq_val:
            matches = self.df[self.df["ت"].astype(str).str.strip() == seq_val]
            if not matches.empty:
                matched_row = matches.iloc[0]

        if matched_row is None and "الرقم العسكري" in self.df.columns and mil_val:
            matches = self.df[self.df["الرقم العسكري"].astype(str).str.strip() == mil_val]
            if not matches.empty:
                matched_row = matches.iloc[0]

        if matched_row is not None:
            try:
                self.delete_record_and_save(matched_row)
                show_app_message("تم الحذف", f"تم حذف بيانات المنتسب '{fullname_val}' بنجاح.", "check", self)
            except Exception as e:
                show_app_message("خطأ في الحذف", f"تعذر حذف السجل:\n{e}", "error", self)

    def _auto_save_to_excel(self):
        excel_target = None
        if self.active_db_path and Path(self.active_db_path).exists():
            excel_target = Path(self.active_db_path)
        else:
            save_dir_str = self.config.get("default_save_path", "")
            if save_dir_str:
                save_dir = Path(save_dir_str)
                save_dir.mkdir(parents=True, exist_ok=True)
                filename = self.config.get("database_filename", "database.xlsx")
                excel_target = save_dir / filename

        if excel_target and self.df is not None:
            try:
                export_cols = [c for c in ALL_61_COLUMNS if c in self.df.columns]
                export_df = self.df[export_cols].copy()
                export_df.to_excel(excel_target, index=False)
            except PermissionError:
                messagebox.showerror(
                    "خطأ في حفظ الإكسل",
                    f"تعذر حفظ التعديلات فوق ملف الإكسل الأصلي لأن الملف مفتوح حالياً في برنامج آخر (مثل Excel).\n\n"
                    f"المسار: {excel_target}\n\nيرجى إغلاق الملف في برنامج الإكسل أولاً ثم إعادة المحاولة."
                )
                raise PermissionError("ملف الإكسل قيد الاستخدام")
            except Exception as e:
                messagebox.showerror(
                    "خطأ أثناء الحفظ التلقائي",
                    f"حدث خطأ أثناء حفظ التعديلات فوق ملف الإكسل:\n{e}"
                )
                raise e

    def _build_settings_view(self):
        title_label = ctk.CTkLabel(self.settings_frame, text="⚙️ إعدادات النظام وتكامل البيانات", font=self.font_title)
        title_label.pack(padx=30, pady=(30, 4), anchor="e")

        subtitle_label = ctk.CTkLabel(
            self.settings_frame,
            text="تحكم بمسار الحفظ الافتراضي واستيراد وتصدير قواعد البيانات",
            font=self.font_body,
            text_color=("gray40", "gray60")
        )
        subtitle_label.pack(padx=30, pady=(0, 20), anchor="e")

        path_card = ctk.CTkFrame(self.settings_frame, corner_radius=14, fg_color=("gray95", "gray22"))
        path_card.pack(fill="x", padx=30, pady=10)

        path_header = ctk.CTkLabel(path_card, text="📁 مسار الحفظ الافتراضي وقاعدة البيانات", font=self.font_subtitle)
        path_header.pack(padx=20, pady=(16, 6), anchor="e")

        path_hint = ctk.CTkLabel(
            path_card,
            text="يتم نسخ ملف قاعدة بيانات الإكسل المستورد إلى هذا المجلد وحفظ المسار في config.json للتحميل التلقائي الصامت والحفظ المباشر:",
            font=ctk.CTkFont(family=self.font_family, size=12),
            text_color=("gray40", "gray60")
        )
        path_hint.pack(padx=20, pady=(0, 10), anchor="e")

        path_input_row = ctk.CTkFrame(path_card, fg_color="transparent")
        path_input_row.pack(fill="x", padx=20, pady=(0, 16))
        path_input_row.grid_columnconfigure(0, weight=1)

        self.entry_save_path = ctk.CTkEntry(
            path_input_row,
            placeholder_text="اضغط لاختيار مجلد الحفظ الافتراضي...",
            font=self.font_body,
            height=42,
            corner_radius=10,
            border_width=1
        )
        self.entry_save_path.grid(row=0, column=0, sticky="ew", padx=(10, 0))
        self.entry_save_path.insert(0, self.config.get("default_save_path", ""))

        self.btn_browse = ctk.CTkButton(
            path_input_row,
            text="📂 اختيار مسار...",
            font=self.font_btn,
            height=42,
            corner_radius=10,
            command=self.browse_save_directory
        )
        self.btn_browse.grid(row=0, column=1, padx=(0, 0))

        actions_card = ctk.CTkFrame(self.settings_frame, corner_radius=14, fg_color=("gray95", "gray22"))
        actions_card.pack(fill="x", padx=30, pady=15)

        actions_header = ctk.CTkLabel(actions_card, text="📊 استيراد وتصدير قاعدة البيانات (Excel)", font=self.font_subtitle)
        actions_header.pack(padx=20, pady=(16, 6), anchor="e")

        actions_hint = ctk.CTkLabel(
            actions_card,
            text="عند استيراد ملف Excel، يتم نسخه تلقائياً إلى مجلد الحفظ وتخزينه في الذاكرة (Pandas DataFrame) وتحديثه تلقائياً عند أي إضافة أو تعديل أو حذف:",
            font=ctk.CTkFont(family=self.font_family, size=12),
            text_color=("gray40", "gray60")
        )
        actions_hint.pack(padx=20, pady=(0, 14), anchor="e")

        buttons_row = ctk.CTkFrame(actions_card, fg_color="transparent")
        buttons_row.pack(fill="x", padx=20, pady=(0, 16))

        self.btn_import_excel = ctk.CTkButton(
            buttons_row,
            text="📥  استيراد قاعدة بيانات Excel",
            font=self.font_btn,
            height=45,
            corner_radius=10,
            fg_color=("#107C41", "#107C41"),
            hover_color=("#0B5A2F", "#0B5A2F"),
            command=self.import_excel_database
        )
        self.btn_import_excel.pack(side="right", padx=(10, 0), expand=True, fill="x")

        self.btn_export_save = ctk.CTkButton(
            buttons_row,
            text="💾  تصدير نسخة كاملة",
            font=self.font_btn,
            height=45,
            corner_radius=10,
            command=self.export_save_changes
        )
        self.btn_export_save.pack(side="left", padx=(0, 10), expand=True, fill="x")

        self.lbl_settings_db_status = ctk.CTkLabel(
            actions_card,
            text="حالة قاعدة البيانات: لم يتم تحديد ملف بعد",
            font=ctk.CTkFont(family=self.font_family, size=12),
            text_color=("gray40", "gray60")
        )
        self.lbl_settings_db_status.pack(padx=20, pady=(0, 14), anchor="e")

    def _check_and_autoload_database(self):
        save_dir = Path(self.config.get("default_save_path", ""))
        db_filename = self.config.get("database_filename", "database.xlsx")

        if not save_dir.exists():
            return

        target_file = save_dir / db_filename
        if not target_file.exists():
            excel_files = list(save_dir.glob("*.xlsx")) + list(save_dir.glob("*.xls"))
            if excel_files:
                target_file = excel_files[0]
            else:
                return

        try:
            self._load_dataframe_from_file(target_file, is_silent=True)
        except Exception as e:
            print(f"تنبيه التحميل التلقائي: {e}")

    def import_excel_database(self):
        save_path_str = self.entry_save_path.get().strip() or self.config.get("default_save_path", "")
        if not save_path_str:
            show_app_message("تنبيه", "يرجى تحديد مسار الحفظ الافتراضي أولاً!", "warning", self)
            return

        save_dir = Path(save_path_str)
        try:
            save_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            show_app_message("خطأ", f"تعذر إنشاء أو الوصول لمجلد الحفظ:\\n{e}", "error", self)
            return

        filetypes = [("Excel Files", "*.xlsx *.xls *.xlsm"), ("All Files", "*.*")]
        source_file = filedialog.askopenfilename(title="اختر ملف قاعدة بيانات Excel للاستيراد", filetypes=filetypes)
        if not source_file:
            return

        source_path = Path(source_file)
        target_path = save_dir / source_path.name

        try:
            shutil.copy2(source_path, target_path)
            self.config["database_filename"] = source_path.name
            self.config["default_save_path"] = str(save_dir)
            save_config(self.config)

            success = self._load_dataframe_from_file(target_path, is_silent=False)
            if success:
                show_app_message(
                    "تم الاستيراد بنجاح",
                    f"تم نسخ ملف قاعدة البيانات بنجاح إلى:\\n{target_path}\\n\\n"
                    f"تم تحميل {len(self.df)} سجلاً في الذاكرة مع الـ 61 عموداً الكاملة.\\n"
                    "يمكنك الآن النقر المزدوج على أي صف لتعديل أو حذف البيانات، أو الضغط على 'إضافة منتسب جديد'.",
                    "check",
                    self
                )
                self.select_view("home")
        except Exception as e:
            show_app_message("خطأ أثناء الاستيراد", f"تعذر استيراد أو قراءة ملف Excel:\\n{e}", "error", self)

    def _load_dataframe_from_file(self, file_path: Path, is_silent: bool = False) -> bool:
        try:
            raw_df = pd.read_excel(file_path)
            processed_df = self._map_and_sanitize_61_columns(raw_df)
            self.df = processed_df
            self.active_db_path = file_path

            self._populate_table(self.df)
            self.empty_state_frame.place_forget()

            status_msg = f"قاعدة البيانات النشطة: {file_path.name} ({len(self.df)} سجل)"
            self.lbl_settings_db_status.configure(text=f"حالة قاعدة البيانات: {status_msg}")
            self.lbl_db_info.configure(text=f"📄 {file_path.name}")
            return True
        except Exception as e:
            if not is_silent:
                raise e
            return False

    def _map_and_sanitize_61_columns(self, raw_df: pd.DataFrame) -> pd.DataFrame:
        df = raw_df.copy()
        clean_cols = {str(c).strip(): c for c in df.columns}
        num_rows = len(df)
        data_dict = {}

        for col_name in ALL_61_COLUMNS:
            matched_col = None
            for existing_clean, orig in clean_cols.items():
                if normalize_arabic(existing_clean) == normalize_arabic(col_name):
                    matched_col = orig
                    break

            if matched_col:
                data_dict[col_name] = df[matched_col].astype(str)
            else:
                data_dict[col_name] = ["-"] * num_rows

        processed_df = pd.DataFrame(data_dict)
        if "ت" in processed_df.columns and (processed_df["ت"] == "-").all():
            processed_df["ت"] = list(range(1, num_rows + 1))

        name_series = processed_df["الاسم الرباعي واللقب"].astype(str)
        mil_series = processed_df["الرقم العسكري"].astype(str)
        processed_df["_search_name"] = name_series.apply(normalize_arabic)
        processed_df["_search_mil"] = mil_series.str.strip().str.lower()
        return processed_df

    def _populate_table(self, dataframe: pd.DataFrame):
        for item in self.tree.get_children():
            self.tree.delete(item)

        if dataframe is None or dataframe.empty:
            total_records = len(self.df) if self.df is not None else 0
            if total_records == 0:
                self.empty_state_frame.place(relx=0.5, rely=0.5, anchor="center")
                self.lbl_status_counter.configure(text="لا توجد بيانات محملة (اضغط 'إضافة منتسب جديد' للبدء)")
            else:
                self.empty_state_frame.place_forget()
                self.lbl_status_counter.configure(text=f"لا توجد نتائج تطابق البحث (إجمالي السجلات: {total_records})")
            return

        self.empty_state_frame.place_forget()
        for idx, row in dataframe.iterrows():
            tag = "evenrow" if idx % 2 == 0 else "oddrow"
            values = (
                str(row.get("ت", idx + 1)),
                str(row.get("الرقم العسكري", "-")),
                str(row.get("الاسم الرباعي واللقب", "-")),
                str(row.get("المنصب الحالي", "-")),
                str(row.get("رقم الهاتف الأساسي", "-"))
            )
            self.tree.insert("", "end", values=values, tags=(tag,))

        if hasattr(self, "tree_row_colors"):
            self.tree.tag_configure("evenrow", background=self.tree_row_colors[0])
            self.tree.tag_configure("oddrow", background=self.tree_row_colors[1])

        displayed_count = len(dataframe)
        total_count = len(self.df) if self.df is not None else displayed_count
        if displayed_count == total_count:
            self.lbl_status_counter.configure(text=f"إجمالي السجلات المعروضة: {displayed_count}")
        else:
            self.lbl_status_counter.configure(text=f"النتائج المطابقة: {displayed_count} من أصل {total_count}")

    def _on_search_query_changed(self, *args):
        if self.df is None or self.df.empty:
            return

        query = self.search_var.get().strip()
        if not query:
            self._populate_table(self.df)
            return

        query_norm = normalize_arabic(query)
        mask = (
            self.df["_search_name"].str.contains(query_norm, na=False, regex=False) |
            self.df["_search_mil"].str.contains(query_norm, na=False, regex=False)
        )
        filtered_df = self.df[mask].reset_index(drop=True)
        self._populate_table(filtered_df)

    def _clear_search(self):
        self.search_var.set("")
        if self.df is not None:
            self._populate_table(self.df)

    def select_view(self, view_name: str):
        self.home_frame.grid_forget()
        self.settings_frame.grid_forget()

        default_btn_fg = "transparent"
        self.btn_home.configure(fg_color=default_btn_fg)
        self.btn_settings.configure(fg_color=default_btn_fg)

        active_fg = ("#3b8ed0", "#1f538d")
        if view_name == "home":
            self.home_frame.grid(row=0, column=1, sticky="nsew", padx=(7, 14), pady=14)
            self.btn_home.configure(fg_color=active_fg)
        elif view_name == "settings":
            self.settings_frame.grid(row=0, column=1, sticky="nsew", padx=(7, 14), pady=14)
            self.btn_settings.configure(fg_color=active_fg)

    def toggle_appearance_mode(self):
        new_mode = "Dark" if self.theme_switch.get() == 1 else "Light"
        ctk.set_appearance_mode(new_mode)
        self.config["appearance_mode"] = new_mode
        save_config(self.config)
        self._apply_treeview_styling(new_mode)

    def browse_save_directory(self):
        current_path = self.entry_save_path.get().strip() or str(Path.home())
        folder_selected = filedialog.askdirectory(title="اختر مجلد الحفظ الافتراضي للبرنامج", initialdir=current_path)
        if folder_selected:
            normalized_path = os.path.normpath(folder_selected)
            self.entry_save_path.delete(0, tk.END)
            self.entry_save_path.insert(0, normalized_path)
            self.config["default_save_path"] = normalized_path
            if save_config(self.config):
                show_app_message(
                    "تم الحفظ",
                    f"تم اعتماد وتعيين مسار الحفظ الافتراضي بنجاح:\\n\\n{normalized_path}\\n\\n(تم التحديث في ملف config.json)",
                    "check",
                    self
                )

    def export_save_changes(self):
        current_save_path = self.entry_save_path.get().strip()
        if not current_save_path:
            show_app_message("تنبيه", "يرجى تحديد مسار الحفظ الافتراضي أولاً!", "warning", self)
            return

        if self.df is None or self.df.empty:
            show_app_message("تنبيه", "لا توجد بيانات في الذاكرة لتصديرها، يرجى استيراد ملف إكسل أو إضافة منتسبين أولاً.", "warning", self)
            return

        save_dir = Path(current_save_path)
        save_dir.mkdir(parents=True, exist_ok=True)
        export_file = save_dir / f"backup_{self.config.get('database_filename', 'database.xlsx')}"

        try:
            export_cols = [c for c in ALL_61_COLUMNS if c in self.df.columns]
            export_df = self.df[export_cols].copy()
            export_df.to_excel(export_file, index=False)
            show_app_message(
                "تصدير البيانات",
                f"تم تصدير نسخة احتياطية لكافة السجلات بنجاح مع الـ 61 عموداً في ملف Excel:\\n\\n📂 {export_file}",
                "check",
                self
            )
        except Exception as e:
            show_app_message("خطأ في التصدير", f"تعذر حفظ ملف Excel:\\n{e}", "error", self)


if __name__ == "__main__":
    app = ModernApp()
    app.mainloop()
`;

export const REQUIREMENTS_TXT = `customtkinter>=5.2.0
openpyxl>=3.1.2
pandas>=2.1.0
pillow>=10.0.0
CTkMessagebox>=2.5
`;

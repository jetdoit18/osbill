/**
 * Freight Billing Tracker - Core Application Logic
 * Supports 3 transport companies: SCGJWD, NST, RTT
 * Multi-unit operating support: DC WGN, DC BBN & Branches
 * 2 billing cycles per month: 1-15 and 16-end of month
 * Statuses:
 *  1. New (new) - รอบใหม่ยังไม่มีการอัพเดทข้อมูล
 *  2. บริษัทขนส่งแจ้งยอด (submitted)
 *  3. อยู่ระหว่างแก้ไขข้อมูลเพิ่มเติม (revision)
 *  4. ผู้ว่าจ้างยืนยันยอดค่าขนส่ง (confirmed)
 *  5. ไม่มีการใช้งานรถขนส่ง (no_usage)
 * Admin User Management with role-based access
 * Scope: แสดงข้อมูลถึง 1 เดือนก่อนหน้า (ไม่แสดงข้อมูลเดือนปัจจุบัน)
 * 3-Month Recent Overview Dashboard
 */

const { createApp, ref, reactive, computed, onMounted } = Vue;

const STORAGE_KEY = 'freight_billing_tracker_records_v13';
const USERS_STORAGE_KEY = 'freight_billing_tracker_users_v3';
const AUTH_USER_KEY = 'freight_billing_tracker_auth_user_v5';

// 3 Transport Companies
const COMPANIES = [
  { id: 'SCGJWD', name: 'SCGJWD', code: 'SCGJWD' },
  { id: 'NST', name: 'NST', code: 'NST' },
  { id: 'RTT', name: 'RTT', code: 'RTT' }
];

// Operating Units / Branches per Company
const COMPANY_UNITS = {
  SCGJWD: [
    { id: 'DC_WGN_GT', name: 'DC WGN (วังน้อย)-GT', shortName: 'DC WGN-GT', type: 'dc', hasBranch: true, hasMT: false },
    { id: 'DC_WGN_MT', name: 'DC WGN (วังน้อย)-MT', shortName: 'DC WGN-MT', type: 'dc', hasBranch: false, hasMT: true },
    { id: 'DC_BBN', name: 'DC BBN (บางบอน)', shortName: 'DC BBN', type: 'dc', hasBranch: true, hasMT: true },
    { id: 'BKK1', name: 'สาขา BKK1', shortName: 'BKK1', type: 'branch', hasBranch: true, hasMT: false },
    { id: 'BKK2', name: 'สาขา BKK2', shortName: 'BKK2', type: 'branch', hasBranch: true, hasMT: false },
    { id: 'SPK', name: 'สาขา SPK', shortName: 'SPK', type: 'branch', hasBranch: true, hasMT: false },
    { id: 'PTN', name: 'สาขา PTN', shortName: 'PTN', type: 'branch', hasBranch: true, hasMT: false },
    { id: 'SRB', name: 'สาขา SRB', shortName: 'SRB', type: 'branch', hasBranch: true, hasMT: false },
    { id: 'PNL', name: 'สาขา PNL', shortName: 'PNL', type: 'branch', hasBranch: true, hasMT: false },
    { id: 'NSW', name: 'สาขา NSW', shortName: 'NSW', type: 'branch', hasBranch: true, hasMT: false },
    { id: 'CHM', name: 'สาขา CHM', shortName: 'CHM', type: 'branch', hasBranch: true, hasMT: false },
    { id: 'CHR', name: 'สาขา CHR', shortName: 'CHR', type: 'branch', hasBranch: true, hasMT: false },
    { id: 'KKN', name: 'สาขา KKN', shortName: 'KKN', type: 'branch', hasBranch: true, hasMT: false },
    { id: 'CBR', name: 'สาขา CBR', shortName: 'CBR', type: 'branch', hasBranch: true, hasMT: false },
    { id: 'SKL', name: 'สาขา SKL', shortName: 'SKL', type: 'branch', hasBranch: true, hasMT: false }
  ],
  NST: [
    { id: 'DC_WGN_GT', name: 'DC WGN (วังน้อย)-GT', shortName: 'DC WGN-GT', type: 'dc', hasBranch: true, hasMT: false },
    { id: 'DC_WGN_MT', name: 'DC WGN (วังน้อย)-MT', shortName: 'DC WGN-MT', type: 'dc', hasBranch: false, hasMT: true },
    { id: 'DC_BBN', name: 'DC BBN (บางบอน)', shortName: 'DC BBN', type: 'dc', hasBranch: true, hasMT: true },
    { id: 'CBR', name: 'สาขา CBR', shortName: 'CBR', type: 'branch', hasBranch: true, hasMT: false },
    { id: 'CTB', name: 'สาขา CTB', shortName: 'CTB', type: 'branch', hasBranch: true, hasMT: false },
    { id: 'NKR', name: 'สาขา NKR', shortName: 'NKR', type: 'branch', hasBranch: true, hasMT: false },
    { id: 'SKN', name: 'สาขา SKN', shortName: 'SKN', type: 'branch', hasBranch: true, hasMT: false },
    { id: 'UBN', name: 'สาขา UBN', shortName: 'UBN', type: 'branch', hasBranch: true, hasMT: false },
    { id: 'SSK', name: 'สาขา SSK', shortName: 'SSK', type: 'branch', hasBranch: true, hasMT: false },
    { id: 'SRT', name: 'สาขา SRT', shortName: 'SRT', type: 'branch', hasBranch: true, hasMT: false }
  ],
  RTT: [
    { id: 'DC_WGN_GT', name: 'DC WGN (วังน้อย)-GT', shortName: 'DC WGN-GT', type: 'dc', hasBranch: true, hasMT: false },
    { id: 'DC_WGN_MT', name: 'DC WGN (วังน้อย)-MT', shortName: 'DC WGN-MT', type: 'dc', hasBranch: false, hasMT: true },
    { id: 'DC_BBN', name: 'DC BBN (บางบอน)', shortName: 'DC BBN', type: 'dc', hasBranch: true, hasMT: true }
  ]
};

// Initial Default Accounts
const DEFAULT_ACCOUNTS = [
  {
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    name: 'ผู้ดูแลภาพรวม (Admin)',
    roleLabel: 'ผู้ว่าจ้าง / ติดตามภาพรวม',
    companyId: null,
    companyName: 'ทุกบริษัท',
    badgeClass: 'bg-sky-100 text-sky-800'
  },
  {
    username: 'scgjwd',
    password: 'scg123',
    role: 'SCGJWD',
    name: 'จนท. ขนส่ง SCGJWD',
    roleLabel: 'บริษัทขนส่ง',
    companyId: 'SCGJWD',
    companyName: 'SCGJWD',
    badgeClass: 'bg-red-100 text-red-800'
  },
  {
    username: 'nst',
    password: 'nst123',
    role: 'NST',
    name: 'จนท. ขนส่ง NST',
    roleLabel: 'บริษัทขนส่ง',
    companyId: 'NST',
    companyName: 'NST',
    badgeClass: 'bg-blue-100 text-blue-800'
  },
  {
    username: 'rtt',
    password: 'rtt123',
    role: 'RTT',
    name: 'จนท. ขนส่ง RTT',
    roleLabel: 'บริษัทขนส่ง',
    companyId: 'RTT',
    companyName: 'RTT',
    badgeClass: 'bg-emerald-100 text-emerald-800'
  }
];

// Thai Month Names
const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

createApp({
  setup() {
    // Users state
    const allUsers = ref([]);

    // Auth State
    const isLoggedIn = ref(false);
    const currentUser = reactive({
      username: '',
      role: '',
      name: '',
      roleLabel: '',
      companyId: null,
      companyName: '',
      badgeClass: ''
    });

    const loginForm = reactive({
      username: '',
      password: ''
    });
    const loginError = ref('');

    // User Management Modal State (Admin only)
    const showUserManagementModal = ref(false);
    const showUserEditModal = ref(false);
    const userEditIndex = ref(-1);
    const userForm = reactive({
      username: '',
      password: '',
      name: '',
      role: 'SCGJWD',
      companyId: 'SCGJWD'
    });
    const userFormError = ref('');

    // Date navigation state: Max allowed month is 1 month prior to current month
    const today = new Date();
    const maxAllowedDate = (() => {
      const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return {
        year: d.getFullYear(),
        month: d.getMonth() + 1
      };
    })();

    // Initialize to 1 month prior
    const selectedYear = ref(maxAllowedDate.year);
    const selectedMonth = ref(maxAllowedDate.month);
    const selectedMonthYear = ref(`${selectedYear.value}-${String(selectedMonth.value).padStart(2, '0')}`);

    // Views & Filters
    const activeView = ref('dashboard3m'); // 'dashboard3m' | 'cards' | 'matrix'
    const filterCycle = ref('all'); // 'all' | '1' | '2'
    const filterCompany = ref('all'); // 'all' | 'SCGJWD' | 'NST' | 'RTT'
    const filterUnit = ref('all'); // 'all' | 'dc' | 'branch' | specific unit ID

    // Database records
    const allRecords = ref([]);

    // UI Modals
    const showSubmitModal = ref(false);
    const showDetailModal = ref(false);

    const activeItem = ref(null);

    // Form for transporter update
    const formSubmit = reactive({
      amountBranch: '',
      amountMT: '',
      amountService: '', // 3. ค่าบริการงานขนส่ง
      amountOther: '',   // 4. งานขนส่งเพิ่มเติมอื่นๆ
      note: '',          // หมายเหตุ (Free text สูงสุด 150 ตัวอักษร)
      status: 'new'      // 'new' | 'submitted' | 'revision' | 'confirmed' | 'no_usage'
    });

    // Auto-calculated sum of the parts
    const formSubmitTotal = computed(() => {
      if (formSubmit.status === 'new' || formSubmit.status === 'no_usage') {
        return 0;
      }
      const b = (activeItem.value && activeItem.value.hasBranch === false) ? 0 : (parseFloat(formSubmit.amountBranch) || 0);
      const m = (activeItem.value && activeItem.value.hasMT) ? (parseFloat(formSubmit.amountMT) || 0) : 0;
      const s = parseFloat(formSubmit.amountService) || 0;
      const o = parseFloat(formSubmit.amountOther) || 0;
      return b + m + s + o;
    });

    // Toast Notification
    const toast = reactive({
      show: false,
      message: '',
      type: 'success'
    });

    const triggerToast = (message, type = 'success') => {
      toast.message = message;
      toast.type = type;
      toast.show = true;
      setTimeout(() => {
        toast.show = false;
      }, 3500);
    };

    // Calculate last day of month
    const getLastDayOfMonth = (year, month) => {
      return new Date(year, month, 0).getDate();
    };

    // Month Label
    const currentMonthLabel = computed(() => {
      const monthName = THAI_MONTHS[selectedMonth.value - 1];
      const thaiYear = selectedYear.value + 543;
      return `${monthName} ${thaiYear} (${selectedYear.value})`;
    });

    // Can go next month (limited to max 1 month prior to current month)
    const canGoNextMonth = computed(() => {
      const currentTotal = selectedYear.value * 12 + selectedMonth.value;
      const maxTotal = maxAllowedDate.year * 12 + maxAllowedDate.month;
      return currentTotal < maxTotal;
    });

    // Month Options: Shows up to 1 month prior (does NOT show current month)
    const monthYearOptions = computed(() => {
      const options = [];
      const baseDate = new Date();
      // From 12 months ago up to -1 month (1 month prior)
      for (let offset = -12; offset <= -1; offset++) {
        const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + offset, 1);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const val = `${y}-${String(m).padStart(2, '0')}`;
        const label = `${THAI_MONTHS[m - 1]} ${y + 543}`;
        options.push({ value: val, label, year: y, month: m });
      }
      return options.reverse();
    });

    // ============================================================
    // USER MANAGEMENT FUNCTIONS
    // ============================================================
    const loadUsers = () => {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      if (saved) {
        try {
          allUsers.value = JSON.parse(saved);
        } catch (e) {
          allUsers.value = [...DEFAULT_ACCOUNTS];
        }
      } else {
        allUsers.value = [...DEFAULT_ACCOUNTS];
        saveUsers();
      }
    };

    const saveUsers = () => {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(allUsers.value));
    };

    const openUserManagementModal = () => {
      loadUsers();
      showUserManagementModal.value = true;
    };

    const openCreateUserModal = () => {
      userEditIndex.value = -1;
      userForm.username = '';
      userForm.password = '';
      userForm.name = '';
      userForm.role = 'SCGJWD';
      userForm.companyId = 'SCGJWD';
      userFormError.value = '';
      showUserEditModal.value = true;
    };

    const openEditUserModal = (u, idx) => {
      userEditIndex.value = idx;
      userForm.username = u.username;
      userForm.password = u.password;
      userForm.name = u.name;
      userForm.role = u.role;
      userForm.companyId = u.companyId || 'SCGJWD';
      userFormError.value = '';
      showUserEditModal.value = true;
    };

    const saveUserAccount = () => {
      userFormError.value = '';
      if (!userForm.username || !userForm.password || !userForm.name) {
        userFormError.value = 'กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง';
        return;
      }

      // Check duplicate username
      const dup = allUsers.value.find((u, i) => i !== userEditIndex.value && u.username.toLowerCase() === userForm.username.trim().toLowerCase());
      if (dup) {
        userFormError.value = 'ชื่อผู้ใช้งาน (Username) นี้มีอยู่ในระบบแล้ว';
        return;
      }

      let companyId = null;
      let companyName = 'ทุกบริษัท';
      let roleLabel = 'ผู้ดูแลระบบ';
      let badgeClass = 'bg-sky-100 text-sky-800';

      if (userForm.role !== 'admin') {
        companyId = userForm.companyId;
        companyName = userForm.companyId;
        roleLabel = 'บริษัทขนส่ง';
        if (companyId === 'SCGJWD') badgeClass = 'bg-red-100 text-red-800';
        else if (companyId === 'NST') badgeClass = 'bg-blue-100 text-blue-800';
        else if (companyId === 'RTT') badgeClass = 'bg-emerald-100 text-emerald-800';
      }

      const accountObj = {
        username: userForm.username.trim(),
        password: userForm.password.trim(),
        role: userForm.role,
        name: userForm.name.trim(),
        roleLabel,
        companyId,
        companyName,
        badgeClass
      };

      if (userEditIndex.value === -1) {
        allUsers.value.push(accountObj);
        triggerToast(`เพิ่มผู้ใช้งาน "${accountObj.name}" สำเร็จ`, 'success');
      } else {
        allUsers.value[userEditIndex.value] = accountObj;
        if (currentUser.username === accountObj.username) {
          Object.assign(currentUser, accountObj);
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(currentUser));
        }
        triggerToast(`แก้ไขข้อมูลผู้ใช้งาน "${accountObj.name}" สำเร็จ`, 'success');
      }

      saveUsers();
      showUserEditModal.value = false;
    };

    const deleteUserAccount = (idx) => {
      const u = allUsers.value[idx];
      if (!u) return;
      if (u.username === currentUser.username) {
        alert('ไม่สามารถลบบัญชีผู้ใช้ที่กำลังเข้าสู่ระบบอยู่ในขณะนี้ได้');
        return;
      }
      if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งาน "${u.name}" (${u.username})?`)) {
        allUsers.value.splice(idx, 1);
        saveUsers();
        triggerToast(`ลบผู้ใช้งาน "${u.name}" เรียบร้อยแล้ว`, 'info');
      }
    };

    // ============================================================
    // 3-MONTH RECENT LOGIC & COMPUTATIONS (Up to 1 Month Prior)
    // ============================================================
    const last3Months = computed(() => {
      const months = [];
      let y = selectedYear.value;
      let m = selectedMonth.value;

      for (let i = 2; i >= 0; i--) {
        let targetMonth = m - i;
        let targetYear = y;
        while (targetMonth <= 0) {
          targetMonth += 12;
          targetYear -= 1;
        }
        const lastDay = getLastDayOfMonth(targetYear, targetMonth);
        months.push({
          year: targetYear,
          month: targetMonth,
          thaiYear: targetYear + 543,
          monthName: THAI_MONTHS[targetMonth - 1],
          monthNameShort: THAI_MONTHS_SHORT[targetMonth - 1],
          label: `${THAI_MONTHS[targetMonth - 1]} ${targetYear + 543}`,
          lastDay
        });
      }
      return months;
    });

    // Stats for 3-Month Overview
    const dashboard3mStats = computed(() => {
      const months = last3Months.value;
      const targetCompany = currentUser.role !== 'admin' ? currentUser.companyId : (filterCompany.value !== 'all' ? filterCompany.value : null);

      // Filter all records for the 3 months
      const records3m = allRecords.value.filter(r => {
        const in3m = months.some(m => m.year === r.year && m.month === r.month);
        if (!in3m) return false;
        if (targetCompany && r.companyId !== targetCompany) return false;
        if (filterUnit.value !== 'all') {
          if (filterUnit.value === 'dc' && r.unitType !== 'dc') return false;
          if (filterUnit.value === 'branch' && r.unitType !== 'branch') return false;
          if (filterUnit.value !== 'dc' && filterUnit.value !== 'branch' && r.unitId !== filterUnit.value) return false;
        }
        return true;
      });

      const totalCycles = records3m.length;
      const newCycles = records3m.filter(r => r.status === 'new').length;
      const confirmedCycles = records3m.filter(r => r.status === 'confirmed').length;
      const submittedCycles = records3m.filter(r => r.status === 'submitted').length;
      const revisionCycles = records3m.filter(r => r.status === 'revision').length;
      const noUsageCycles = records3m.filter(r => r.status === 'no_usage').length;
      const totalAmount = records3m.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      
      // Handled = Confirmed + No Usage
      const handledCycles = confirmedCycles + noUsageCycles;
      const completionRate = totalCycles > 0 ? Math.round((handledCycles / totalCycles) * 100) : 0;

      // Company breakdown for the 3 months
      const allowedCompanies = currentUser.role !== 'admin'
        ? COMPANIES.filter(c => c.id === currentUser.companyId)
        : (filterCompany.value !== 'all' ? COMPANIES.filter(c => c.id === filterCompany.value) : COMPANIES);

      const companyBreakdown = allowedCompanies.map(c => {
        const compRecs = allRecords.value.filter(r => {
          const in3m = months.some(m => m.year === r.year && m.month === r.month);
          return in3m && r.companyId === c.id;
        });
        const compTotal = compRecs.length;
        const compNew = compRecs.filter(r => r.status === 'new').length;
        const compConfirmed = compRecs.filter(r => r.status === 'confirmed').length;
        const compSubmitted = compRecs.filter(r => r.status === 'submitted').length;
        const compRevision = compRecs.filter(r => r.status === 'revision').length;
        const compNoUsage = compRecs.filter(r => r.status === 'no_usage').length;
        const compAmount = compRecs.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        const compRate = compTotal > 0 ? Math.round(((compConfirmed + compNoUsage) / compTotal) * 100) : 0;

        return {
          id: c.id,
          name: c.name,
          total: compTotal,
          newCount: compNew,
          confirmed: compConfirmed,
          submitted: compSubmitted,
          revision: compRevision,
          noUsage: compNoUsage,
          amount: compAmount,
          rate: compRate
        };
      });

      // Outstanding / Incomplete Cycles List (แสดงเฉพาะสถานะ "บริษัทขนส่งแจ้งยอด" และ "อยู่ระหว่างแก้ไขข้อมูลเพิ่มเติม")
      const pendingList = records3m.filter(r => r.status === 'submitted' || r.status === 'revision');

      return {
        totalCycles,
        newCycles,
        confirmedCycles,
        submittedCycles,
        revisionCycles,
        noUsageCycles,
        totalAmount,
        completionRate,
        companyBreakdown,
        pendingList
      };
    });

    // Available units for dropdown
    const availableUnits = computed(() => {
      if (currentUser.role !== 'admin') {
        return COMPANY_UNITS[currentUser.companyId] || [];
      }
      if (filterCompany.value !== 'all') {
        return COMPANY_UNITS[filterCompany.value] || [];
      }
      const all = [];
      Object.keys(COMPANY_UNITS).forEach(k => {
        COMPANY_UNITS[k].forEach(u => {
          if (!all.some(item => item.id === u.id)) {
            all.push(u);
          }
        });
      });
      return all;
    });

    // Visible units rows for Matrix and 3-Month table
    const visibleUnitRows = computed(() => {
      const rows = [];
      const comps = visibleCompanies.value;

      comps.forEach(c => {
        const units = COMPANY_UNITS[c.id] || [];
        units.forEach(u => {
          if (filterUnit.value !== 'all') {
            if (filterUnit.value === 'dc' && u.type !== 'dc') return;
            if (filterUnit.value === 'branch' && u.type !== 'branch') return;
            if (filterUnit.value !== 'dc' && filterUnit.value !== 'branch' && u.id !== filterUnit.value) return;
          }
          rows.push({
            companyId: c.id,
            companyName: c.name,
            unitId: u.id,
            unitName: u.name,
            shortName: u.shortName,
            unitType: u.type,
            hasBranch: u.hasBranch !== false,
            hasMT: !!u.hasMT,
            key: `${c.id}-${u.id}`
          });
        });
      });
      return rows;
    });

    // Single Month Records
    const currentMonthRecords = computed(() => {
      return allRecords.value.filter(
        r => r.year === selectedYear.value && r.month === selectedMonth.value
      );
    });

    // Display records (filtered for Card view)
    const displayRecords = computed(() => {
      let recs = currentMonthRecords.value;
      if (currentUser.role !== 'admin') {
        recs = recs.filter(r => r.companyId === currentUser.companyId);
      } else if (filterCompany.value !== 'all') {
        recs = recs.filter(r => r.companyId === filterCompany.value);
      }
      if (filterCycle.value !== 'all') {
        recs = recs.filter(r => r.cycle === Number(filterCycle.value));
      }
      if (filterUnit.value !== 'all') {
        if (filterUnit.value === 'dc') {
          recs = recs.filter(r => r.unitType === 'dc');
        } else if (filterUnit.value === 'branch') {
          recs = recs.filter(r => r.unitType === 'branch');
        } else {
          recs = recs.filter(r => r.unitId === filterUnit.value);
        }
      }
      return recs;
    });

    // Ensure records exist for a given month/year across all units
    const ensureMonthRecords = (year, month) => {
      const lastDay = getLastDayOfMonth(year, month);
      const mShort = THAI_MONTHS_SHORT[month - 1];

      COMPANIES.forEach(comp => {
        const units = COMPANY_UNITS[comp.id] || [];
        units.forEach(unit => {
          // Cycle 1: 1 - 15
          const id1 = `CYCLE-${year}-${String(month).padStart(2, '0')}-1-${comp.id}-${unit.id}`;
          let rec1 = allRecords.value.find(r => r.id === id1);
          if (!rec1) {
            allRecords.value.push({
              id: id1,
              year,
              month,
              cycle: 1,
              periodText: `1 - 15 ${mShort} ${year + 543}`,
              dueDateText: `20 ${mShort} ${year + 543}`,
              companyId: comp.id,
              companyName: comp.name,
              unitId: unit.id,
              unitName: unit.name,
              shortName: unit.shortName,
              unitType: unit.type,
              hasBranch: unit.hasBranch !== false,
              hasMT: !!unit.hasMT,
              note: '',
              status: 'new',
              amountBranch: unit.hasBranch === false ? 0 : null,
              amountMT: unit.hasMT ? null : 0,
              amountService: null,
              amountOther: null,
              amount: null,
              updatedAt: null,
              updatedBy: null,
              history: [
                {
                  timestamp: new Date().toISOString(),
                  user: 'ระบบอัตโนมัติ',
                  action: `เปิดรอบการเรียกเก็บค่าขนส่งรอบที่ 1 (${unit.name}) - สถานะ New`,
                  note: 'ยังไม่มีการแจ้งยอดจากบริษัทขนส่ง'
                }
              ]
            });
          }

          // Cycle 2: 16 - Last Day
          const id2 = `CYCLE-${year}-${String(month).padStart(2, '0')}-2-${comp.id}-${unit.id}`;
          let rec2 = allRecords.value.find(r => r.id === id2);
          if (!rec2) {
            allRecords.value.push({
              id: id2,
              year,
              month,
              cycle: 2,
              periodText: `16 - ${lastDay} ${mShort} ${year + 543}`,
              dueDateText: `5 ${month === 12 ? THAI_MONTHS_SHORT[0] : THAI_MONTHS_SHORT[month]} ${month === 12 ? year + 544 : year + 543}`,
              companyId: comp.id,
              companyName: comp.name,
              unitId: unit.id,
              unitName: unit.name,
              shortName: unit.shortName,
              unitType: unit.type,
              hasBranch: unit.hasBranch !== false,
              hasMT: !!unit.hasMT,
              note: '',
              status: 'new',
              amountBranch: unit.hasBranch === false ? 0 : null,
              amountMT: unit.hasMT ? null : 0,
              amountService: null,
              amountOther: null,
              amount: null,
              updatedAt: null,
              updatedBy: null,
              history: [
                {
                  timestamp: new Date().toISOString(),
                  user: 'ระบบอัตโนมัติ',
                  action: `เปิดรอบการเรียกเก็บค่าขนส่งรอบที่ 2 (${unit.name}) - สถานะ New`,
                  note: 'ยังไม่มีการแจ้งยอดจากบริษัทขนส่ง'
                }
              ]
            });
          }
        });
      });
      saveRecords();
    };

    // Cycle text helper
    const getCycleDateRange = (cycleNum) => {
      const lastDay = getLastDayOfMonth(selectedYear.value, selectedMonth.value);
      const mText = THAI_MONTHS_SHORT[selectedMonth.value - 1];
      const yText = selectedYear.value + 543;
      if (cycleNum === 1) {
        return `1 - 15 ${mText} ${yText}`;
      }
      return `16 - ${lastDay} ${mText} ${yText}`;
    };

    const getCycleDueDate = (cycleNum) => {
      const mText = THAI_MONTHS[selectedMonth.value - 1];
      const yText = selectedYear.value + 543;
      if (cycleNum === 1) {
        return `วันที่ 20 ${mText} ${yText}`;
      }
      const nextMonthIdx = selectedMonth.value === 12 ? 0 : selectedMonth.value;
      const nextYear = selectedMonth.value === 12 ? yText + 1 : yText;
      return `วันที่ 5 ${THAI_MONTHS[nextMonthIdx]} ${nextYear}`;
    };

    const visibleCompanies = computed(() => {
      if (currentUser.role !== 'admin') {
        return COMPANIES.filter(c => c.id === currentUser.companyId);
      }
      if (filterCompany.value !== 'all') {
        return COMPANIES.filter(c => c.id === filterCompany.value);
      }
      return COMPANIES;
    });

    // Single Month KPI stats
    const stats = computed(() => {
      const recs = displayRecords.value;
      const totalAmount = recs.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const newCount = recs.filter(r => r.status === 'new').length;
      const confirmedCount = recs.filter(r => r.status === 'confirmed').length;
      const submittedCount = recs.filter(r => r.status === 'submitted').length;
      const revisionCount = recs.filter(r => r.status === 'revision').length;
      const noUsageCount = recs.filter(r => r.status === 'no_usage').length;

      return {
        totalAmount,
        newCount,
        confirmedCount,
        submittedCount,
        revisionCount,
        noUsageCount,
        totalCycles: recs.length
      };
    });

    // Currency & Date Formatting
    const formatCurrency = (val) => {
      if (val === null || val === undefined || isNaN(val)) return '0.00';
      return Number(val).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatDate = (isoStr) => {
      if (!isoStr) return '-';
      const d = new Date(isoStr);
      return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} น.`;
    };

    // Status Labels & Styling
    const getStatusLabel = (status) => {
      switch (status) {
        case 'new':
          return 'New';
        case 'submitted':
          return 'บริษัทขนส่งแจ้งยอด';
        case 'revision':
          return 'อยู่ระหว่างแก้ไขข้อมูลเพิ่มเติม';
        case 'confirmed':
          return 'ผู้ว่าจ้างยืนยันยอดค่าขนส่ง';
        case 'no_usage':
          return 'ไม่มีการใช้งานรถขนส่ง';
        default:
          return 'New';
      }
    };

    const getStatusBadgeClass = (status) => {
      switch (status) {
        case 'new':
          return 'bg-sky-50 text-sky-700 border border-sky-300 font-semibold';
        case 'submitted':
          return 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold';
        case 'revision':
          return 'bg-rose-100 text-rose-800 border border-rose-300 font-semibold';
        case 'confirmed':
          return 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold';
        case 'no_usage':
          return 'bg-slate-100 text-slate-700 border border-slate-300 font-semibold';
        default:
          return 'bg-sky-50 text-sky-700 border border-sky-300 font-semibold';
      }
    };

    const getStatusIcon = (status) => {
      switch (status) {
        case 'new':
          return 'fa-solid fa-sparkles text-sky-500';
        case 'submitted':
          return 'fa-solid fa-file-invoice-dollar text-amber-600';
        case 'revision':
          return 'fa-solid fa-triangle-exclamation text-rose-600';
        case 'confirmed':
          return 'fa-solid fa-circle-check text-emerald-600';
        case 'no_usage':
          return 'fa-solid fa-ban text-slate-500';
        default:
          return 'fa-solid fa-sparkles text-sky-400';
      }
    };

    const getCompanyBadgeStyle = (compId) => {
      switch (compId) {
        case 'SCGJWD': return 'bg-red-600 text-white shadow-sm';
        case 'NST': return 'bg-blue-600 text-white shadow-sm';
        case 'RTT': return 'bg-emerald-600 text-white shadow-sm';
        default: return 'bg-slate-700 text-white shadow-sm';
      }
    };

    // Permission: User can edit their company (even when confirmed) & Admin can also edit/manage
    const canEditAsTransporter = (item) => {
      if (!item) return false;
      if (currentUser.role === 'admin') return true;
      return currentUser.companyId === item.companyId;
    };

    // Modal Handlers (Transporter Status & Billing Update)
    const openSubmitModal = (item) => {
      if (!item) return;
      activeItem.value = item;
      formSubmit.amountBranch = item.hasBranch === false ? '' : (item.amountBranch !== null && item.amountBranch !== undefined ? item.amountBranch : '');
      formSubmit.amountMT = item.hasMT && item.amountMT !== null && item.amountMT !== undefined ? item.amountMT : '';
      formSubmit.amountService = item.amountService !== null && item.amountService !== undefined ? item.amountService : '';
      formSubmit.amountOther = item.amountOther !== null && item.amountOther !== undefined ? item.amountOther : '';
      formSubmit.note = item.note || '';
      formSubmit.status = item.status || 'new';
      showSubmitModal.value = true;
    };

    // Open cycle edit directly from table click
    const openCycleFromTable = (record) => {
      if (!record) return;
      if (canEditAsTransporter(record)) {
        openSubmitModal(record);
      } else {
        openDetailModal(record);
      }
    };

    const saveSubmitModal = () => {
      if (!activeItem.value) return;
      const item = allRecords.value.find(r => r.id === activeItem.value.id);
      if (!item) return;

      item.note = (formSubmit.note || '').trim().slice(0, 150);

      if (formSubmit.status === 'new') {
        item.amountBranch = item.hasBranch === false ? 0 : null;
        item.amountMT = item.hasMT ? null : 0;
        item.amountService = null;
        item.amountOther = null;
        item.amount = null;
      } else if (formSubmit.status === 'no_usage') {
        item.amountBranch = 0;
        item.amountMT = 0;
        item.amountService = 0;
        item.amountOther = 0;
        item.amount = 0;
      } else {
        item.amountBranch = item.hasBranch === false ? 0 : (parseFloat(formSubmit.amountBranch) || 0);
        item.amountMT = item.hasMT ? (parseFloat(formSubmit.amountMT) || 0) : 0;
        item.amountService = parseFloat(formSubmit.amountService) || 0;
        item.amountOther = parseFloat(formSubmit.amountOther) || 0;
        item.amount = item.amountBranch + item.amountMT + item.amountService + item.amountOther;
      }

      item.status = formSubmit.status;
      item.updatedAt = new Date().toISOString();
      item.updatedBy = currentUser.name;

      const statusText = getStatusLabel(item.status);
      let noteDetails = item.status === 'new'
        ? 'ปรับสถานะเป็น New'
        : (item.status === 'no_usage'
            ? 'ไม่มีการใช้งานรถขนส่งในรอบนี้ (ยอดค่าใช้จ่าย ฿0.00)'
            : `ยอดรวม ฿${formatCurrency(item.amount)}`);

      if (item.note) {
        noteDetails += ` | Note: ${item.note}`;
      }

      item.history.unshift({
        timestamp: new Date().toISOString(),
        user: currentUser.name,
        action: `อัพเดทสถานะ: ${statusText}`,
        note: noteDetails
      });

      saveRecords();
      showSubmitModal.value = false;
      triggerToast(`อัพเดทสถานะ ${item.companyName} (${item.unitName}) เป็น "${statusText}" สำเร็จ`, 'success');
    };

    const openDetailModal = (item) => {
      activeItem.value = item;
      showDetailModal.value = true;
    };

    // Month Navigation (Guarded up to 1 month prior)
    const changeMonth = (delta) => {
      if (delta > 0 && !canGoNextMonth.value) {
        triggerToast('ระบบแสดงข้อมูลย้อนหลังถึง 1 เดือนก่อนหน้าเท่านั้น (ไม่แสดงเดือนปัจจุบัน)', 'info');
        return;
      }

      let m = selectedMonth.value + delta;
      let y = selectedYear.value;
      if (m > 12) {
        m = 1;
        y += 1;
      } else if (m < 1) {
        m = 12;
        y -= 1;
      }

      if (y * 12 + m > maxAllowedDate.year * 12 + maxAllowedDate.month) {
        y = maxAllowedDate.year;
        m = maxAllowedDate.month;
      }

      selectedMonth.value = m;
      selectedYear.value = y;
      selectedMonthYear.value = `${y}-${String(m).padStart(2, '0')}`;
      ensureMonthRecords(y, m);
    };

    const onMonthYearChange = () => {
      const [y, m] = selectedMonthYear.value.split('-').map(Number);
      if (y * 12 + m > maxAllowedDate.year * 12 + maxAllowedDate.month) {
        selectedYear.value = maxAllowedDate.year;
        selectedMonth.value = maxAllowedDate.month;
        selectedMonthYear.value = `${maxAllowedDate.year}-${String(maxAllowedDate.month).padStart(2, '0')}`;
      } else {
        selectedYear.value = y;
        selectedMonth.value = m;
      }
      ensureMonthRecords(selectedYear.value, selectedMonth.value);
    };

    // Matrix Helpers
    const getMatrixItem = (companyId, unitId, cycle) => {
      return currentMonthRecords.value.find(
        r => r.companyId === companyId && r.unitId === unitId && r.cycle === cycle
      );
    };

    const getUnitRowMonthTotal = (companyId, unitId) => {
      const r1 = getMatrixItem(companyId, unitId, 1);
      const r2 = getMatrixItem(companyId, unitId, 2);
      const a1 = r1 && r1.amount ? Number(r1.amount) : 0;
      const a2 = r2 && r2.amount ? Number(r2.amount) : 0;
      return a1 + a2;
    };

    const get3mRecord = (companyId, unitId, year, month, cycle) => {
      return allRecords.value.find(
        r => r.companyId === companyId && r.unitId === unitId && r.year === year && r.month === month && r.cycle === cycle
      );
    };

    // Export Excel via SheetJS
    const exportToExcel = () => {
      try {
        const rows = displayRecords.value.map(r => ({
          'ปี': r.year + 543,
          'เดือน': THAI_MONTHS[r.month - 1],
          'รอบที่': r.cycle,
          'ช่วงวันที่': r.periodText,
          'บริษัทขนส่ง': r.companyName,
          'หน่วยงานที่ใช้งาน': r.unitName,
          'ประเภท': r.unitType === 'dc' ? 'ศูนย์กระจายสินค้า (DC)' : 'สาขา',
          'สถานะ': getStatusLabel(r.status),
          'งานขนส่งกระจายสาขา (บาท)': (r.unitType === 'dc' && r.hasBranch !== false) ? (r.amountBranch || 0) : '-',
          'งานขนส่งกระจายทั่วไป (SR/Van/MT) (บาท)': r.unitType === 'branch' ? (r.amountBranch || 0) : '-',
          'งานขนส่งร้าน MT (บาท)': r.hasMT ? (r.amountMT || 0) : '-',
          'ค่าบริการงานขนส่ง (บาท)': r.amountService || 0,
          'งานขนส่งเพิ่มเติมอื่นๆ (บาท)': r.amountOther || 0,
          'ยอดรวมค่าขนส่ง (บาท)': r.amount || 0,
          'หมายเหตุ (Note)': r.note || '-',
          'อัพเดทล่าสุดเมื่อ': r.updatedAt ? formatDate(r.updatedAt) : '-',
          'ผู้อัพเดท': r.updatedBy || '-'
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `รอบค่าขนส่ง_${selectedMonthYear.value}`);

        const fileName = `Freight_Billing_${selectedMonthYear.value}_${currentUser.role}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        triggerToast(`ส่งออกไฟล์ ${fileName} สำเร็จ`, 'success');
      } catch (err) {
        console.error(err);
        triggerToast('เกิดข้อผิดพลาดในการส่งออก Excel', 'error');
      }
    };

    // Storage persistence
    const saveRecords = () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allRecords.value));
    };

    // Preloaded Default Data generator across all units: ALL RESET TO "new"
    const generateDefaultData = () => {
      const year = 2026;
      const records = [];

      // 3 historical months ending at 1 month prior (June, July, August 2026)
      const monthsConfig = [
        { month: 6, mShort: 'มิ.ย.', lastDay: 30 },
        { month: 7, mShort: 'ก.ค.', lastDay: 31 },
        { month: 8, mShort: 'ส.ค.', lastDay: 31 }
      ];

      monthsConfig.forEach(mConf => {
        const m = mConf.month;
        const mShort = mConf.mShort;
        const lastDay = mConf.lastDay;

        COMPANIES.forEach(comp => {
          const units = COMPANY_UNITS[comp.id] || [];
          units.forEach((unit) => {
            // Record Cycle 1: Set to New
            records.push({
              id: `CYCLE-${year}-${String(m).padStart(2, '0')}-1-${comp.id}-${unit.id}`,
              year,
              month: m,
              cycle: 1,
              periodText: `1 - 15 ${mShort} 2569`,
              dueDateText: `20 ${mShort} 2569`,
              companyId: comp.id,
              companyName: comp.name,
              unitId: unit.id,
              unitName: unit.name,
              shortName: unit.shortName,
              unitType: unit.type,
              hasBranch: unit.hasBranch !== false,
              hasMT: !!unit.hasMT,
              note: '',
              status: 'new',
              amountBranch: unit.hasBranch === false ? 0 : null,
              amountMT: unit.hasMT ? null : 0,
              amountService: null,
              amountOther: null,
              amount: null,
              updatedAt: null,
              updatedBy: null,
              history: [
                {
                  timestamp: new Date().toISOString(),
                  user: 'ระบบอัตโนมัติ',
                  action: `เปิดรอบการเรียกเก็บค่าขนส่งรอบที่ 1 (${unit.name})`,
                  note: 'สถานะ New - รอการแจ้งยอดจากบริษัทขนส่ง'
                }
              ]
            });

            // Record Cycle 2: Set to New
            records.push({
              id: `CYCLE-${year}-${String(m).padStart(2, '0')}-2-${comp.id}-${unit.id}`,
              year,
              month: m,
              cycle: 2,
              periodText: `16 - ${lastDay} ${mShort} 2569`,
              dueDateText: `5 ${m === 12 ? 'ม.ค.' : THAI_MONTHS_SHORT[m]} ${m === 12 ? year + 544 : year + 543}`,
              companyId: comp.id,
              companyName: comp.name,
              unitId: unit.id,
              unitName: unit.name,
              shortName: unit.shortName,
              unitType: unit.type,
              hasBranch: unit.hasBranch !== false,
              hasMT: !!unit.hasMT,
              note: '',
              status: 'new',
              amountBranch: unit.hasBranch === false ? 0 : null,
              amountMT: unit.hasMT ? null : 0,
              amountService: null,
              amountOther: null,
              amount: null,
              updatedAt: null,
              updatedBy: null,
              history: [
                {
                  timestamp: new Date().toISOString(),
                  user: 'ระบบอัตโนมัติ',
                  action: `เปิดรอบการเรียกเก็บค่าขนส่งรอบที่ 2 (${unit.name})`,
                  note: 'สถานะ New - รอการแจ้งยอดจากบริษัทขนส่ง'
                }
              ]
            });
          });
        });
      });

      return records;
    };

    // Authentication Handlers
    const login = () => {
      loginError.value = '';
      if (!loginForm.username || !loginForm.password) {
        loginError.value = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน';
        return;
      }

      const found = allUsers.value.find(
        u => u.username.toLowerCase() === loginForm.username.trim().toLowerCase() && u.password === loginForm.password
      );

      if (found) {
        Object.assign(currentUser, found);
        isLoggedIn.value = true;
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(found));
        loginForm.username = '';
        loginForm.password = '';
        loginError.value = '';

        if (currentUser.role !== 'admin') {
          filterCompany.value = currentUser.companyId;
        } else {
          filterCompany.value = 'all';
        }
        filterUnit.value = 'all';

        triggerToast(`ยินดีต้อนรับ ${currentUser.name}`, 'success');
      } else {
        loginError.value = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
      }
    };

    const logout = () => {
      isLoggedIn.value = false;
      localStorage.removeItem(AUTH_USER_KEY);
      currentUser.username = '';
      currentUser.role = '';
      currentUser.name = '';
      currentUser.companyId = null;
      currentUser.companyName = '';
      currentUser.badgeClass = '';
      triggerToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
    };

    // Lifecycle
    onMounted(() => {
      loadUsers();

      // Check active login session
      const savedAuth = localStorage.getItem(AUTH_USER_KEY);
      if (savedAuth) {
        try {
          const u = JSON.parse(savedAuth);
          Object.assign(currentUser, u);
          isLoggedIn.value = true;
          if (u.role !== 'admin') {
            filterCompany.value = u.companyId;
          }
        } catch (e) {
          localStorage.removeItem(AUTH_USER_KEY);
        }
      }

      // Load DB records: Fresh dataset all initialized to 'new'
      const savedRecords = localStorage.getItem(STORAGE_KEY);
      if (savedRecords) {
        try {
          allRecords.value = JSON.parse(savedRecords);
        } catch (e) {
          allRecords.value = generateDefaultData();
        }
      } else {
        allRecords.value = generateDefaultData();
      }

      ensureMonthRecords(selectedYear.value, selectedMonth.value);
    });

    return {
      // Auth & Users
      allUsers,
      isLoggedIn,
      currentUser,
      loginForm,
      loginError,
      login,
      logout,
      showUserManagementModal,
      showUserEditModal,
      userEditIndex,
      userForm,
      userFormError,
      openUserManagementModal,
      openCreateUserModal,
      openEditUserModal,
      saveUserAccount,
      deleteUserAccount,

      // Constants
      COMPANIES,
      COMPANY_UNITS,
      THAI_MONTHS,
      THAI_MONTHS_SHORT,

      // Date state
      selectedYear,
      selectedMonth,
      selectedMonthYear,
      currentMonthLabel,
      canGoNextMonth,
      monthYearOptions,
      changeMonth,
      onMonthYearChange,

      // Views & Filters
      activeView,
      filterCycle,
      filterCompany,
      filterUnit,
      availableUnits,
      visibleUnitRows,

      // Records & Stats
      allRecords,
      currentMonthRecords,
      displayRecords,
      visibleCompanies,
      stats,
      last3Months,
      dashboard3mStats,

      // Modals & Click Handlers
      showSubmitModal,
      showDetailModal,
      activeItem,
      formSubmit,
      formSubmitTotal,
      openSubmitModal,
      openCycleFromTable,
      saveSubmitModal,
      openDetailModal,

      // Helpers
      formatCurrency,
      formatDate,
      getStatusLabel,
      getStatusBadgeClass,
      getStatusIcon,
      getCompanyBadgeStyle,
      canEditAsTransporter,
      getCycleDateRange,
      getCycleDueDate,
      getMatrixItem,
      getUnitRowMonthTotal,
      get3mRecord,
      exportToExcel,

      // Toast
      toast
    };
  }
}).mount('#app');

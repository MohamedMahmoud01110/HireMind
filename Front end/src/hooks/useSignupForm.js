import { useState } from "react";

const INITIAL_FORM = {
  name: "",
  email: "",
  password: "",
  role: "",
  jobRole: "",
};

export function useSignupForm() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [skills, setSkills] = useState([]);
  const [cvFile, setCvFile] = useState(null);
  const [errors, setErrors] = useState({});

  const setField = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const toggleSkill = (skill) =>
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );

  const validate = () => {
    const e = {};

    // ── الاسم: 4 كلمات، حروف بس ──
    if (!form.name.trim()) {
      e.name = "Full name is required";
    } else if (form.name.trim().split(/\s+/).length < 3) {
      e.name = "Please enter your full three-part name";
    } else if (/[^a-zA-Z\u0600-\u06FF\s]/.test(form.name)) {
      e.name = "Name must contain letters only, no numbers";
    }

    // ── الإيميل: صيغة صح وينتهي بـ .com ──
    if (!form.email.trim()) {
      e.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.com$/.test(form.email)) {
      e.email = "Email must be a valid .com address";
    }

    // ── الباسورد: قوي ──
    if (!form.password) {
      e.password = "Password is required";
    } else if (form.password.length < 8) {
      e.password = "Minimum 8 characters";
    } else if (!/[A-Z]/.test(form.password)) {
      e.password = "Must include at least one uppercase letter";
    } else if (!/[a-z]/.test(form.password)) {
      e.password = "Must include at least one lowercase letter";
    } else if (!/[0-9]/.test(form.password)) {
      e.password = "Must include at least one number";
    } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(form.password)) {
      e.password = "Must include at least one special character (!@#$...)";
    }
    if (!form.role) {
      e.role = "Please select your role";
    }

    // // ── Job Role ──
    // if (!form.jobRole) {
    //   e.jobRole = "Please select your job role";
    // }

    return e;
  };

  const handleSubmit = () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const reset = () => {
    setForm(INITIAL_FORM);
    setSkills([]);
    setCvFile(null);
    setErrors({});
  };

  return {
    form,
    setField,
    skills,
    toggleSkill,
    cvFile,
    setCvFile,
    errors,
    handleSubmit,
    reset,
  };
}

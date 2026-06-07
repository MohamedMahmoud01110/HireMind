const STORAGE_KEY = "hiremind_company_jobs";

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function companyKey(email) {
  return (email || "").trim().toLowerCase();
}

export function getCompanyJobs(email) {
  const all = readAll();
  return all[companyKey(email)] || [];
}

export function saveCompanyJob(email, job) {
  const key = companyKey(email);
  const all = readAll();
  const jobs = all[key] || [];

  const staticApplicants = [3, 7, 12, 5, 18, 9, 14, 2, 11, 6];
  const applicantsCount =
    job.applicantsCount ??
    staticApplicants[Math.floor(Math.random() * staticApplicants.length)];

  const newJob = {
    id: `job_${Date.now()}`,
    jobName: job.jobName,
    description: job.description,
    requirements: job.requirements,
    yearsOfExperience: job.yearsOfExperience,
    jobType: job.jobType,
    location: job.location,
    salary: job.salary || "",
    applicantsCount,
    createdAt: new Date().toISOString(),
  };

  all[key] = [newJob, ...jobs];
  writeAll(all);
  return newJob;
}

export function deleteCompanyJob(email, jobId) {
  const key = companyKey(email);
  const all = readAll();
  const jobs = (all[key] || []).filter((j) => j.id !== jobId);
  all[key] = jobs;
  writeAll(all);
}

export function getCompanyJobStats(email) {
  const jobs = getCompanyJobs(email);
  const totalJobs = jobs.length;
  const totalApplicants = jobs.reduce(
    (sum, j) => sum + (j.applicantsCount || 0),
    0,
  );
  return { totalJobs, totalApplicants };
}

/**
 * HireMind Skills Assessment Questions
 * 15 questions across Data, Tech, Business, and Soft Skills domains.
 */
export const ASSESSMENT_QUESTIONS = [
  {
    id: 1,
    category: 'Data & Analytics',
    question: 'Which of the following best describes the purpose of exploratory data analysis (EDA)?',
    options: [
      'To build and train machine learning models',
      'To understand data structure, patterns, and anomalies before modeling',
      'To deploy data pipelines to production',
      'To optimize SQL query performance',
    ],
    correct: 1,
  },
  {
    id: 2,
    category: 'Data & Analytics',
    question: 'In SQL, which clause is used to filter groups of rows after a GROUP BY?',
    options: ['WHERE', 'FILTER', 'HAVING', 'ORDER BY'],
    correct: 2,
  },
  {
    id: 3,
    category: 'Data & Analytics',
    question: 'What does a box plot primarily display?',
    options: [
      'Correlation between two variables',
      'Distribution of a dataset using quartiles and outliers',
      'Time-series trends over a period',
      'Frequency of categorical variables',
    ],
    correct: 1,
  },
  {
    id: 4,
    category: 'Machine Learning',
    question: 'Which technique is used to reduce overfitting in a decision tree model?',
    options: ['Boosting', 'Pruning', 'Scaling', 'Encoding'],
    correct: 1,
  },
  {
    id: 5,
    category: 'Machine Learning',
    question: 'What is the primary purpose of cross-validation?',
    options: [
      'To speed up model training',
      'To visualize model performance',
      'To evaluate model generalization on unseen data',
      'To preprocess missing values',
    ],
    correct: 2,
  },
  {
    id: 6,
    category: 'Programming',
    question: 'In Python, which data structure preserves insertion order and allows duplicate values?',
    options: ['Set', 'Dictionary', 'List', 'Tuple'],
    correct: 2,
  },
  {
    id: 7,
    category: 'Programming',
    question: 'What does the `async/await` pattern solve in JavaScript?',
    options: [
      'Memory management in large applications',
      'Handling asynchronous operations in a readable, synchronous-like style',
      'Optimizing CSS rendering performance',
      'Compiling TypeScript to JavaScript',
    ],
    correct: 1,
  },
  {
    id: 8,
    category: 'Programming',
    question: 'Which React hook is used to perform side effects in a functional component?',
    options: ['useState', 'useContext', 'useEffect', 'useReducer'],
    correct: 2,
  },
  {
    id: 9,
    category: 'Business & Strategy',
    question: 'What does KPI stand for in a business context?',
    options: [
      'Key Performance Indicator',
      'Knowledge Process Integration',
      'Key Product Index',
      'Known Process Improvement',
    ],
    correct: 0,
  },
  {
    id: 10,
    category: 'Business & Strategy',
    question: 'Which framework is commonly used to analyze a company\'s internal strengths and external opportunities?',
    options: ['OKR', 'SWOT', 'SCRUM', 'PESTLE'],
    correct: 1,
  },
  {
    id: 11,
    category: 'Business & Strategy',
    question: 'In Agile methodology, what is the primary purpose of a sprint retrospective?',
    options: [
      'To plan the next sprint backlog',
      'To demo completed features to stakeholders',
      'To reflect on the process and identify improvements',
      'To estimate story points for user stories',
    ],
    correct: 2,
  },
  {
    id: 12,
    category: 'Product & Design',
    question: 'What does "MVP" stand for in product development?',
    options: [
      'Most Viable Product',
      'Minimum Viable Product',
      'Maximum Value Proposition',
      'Minimum Validated Process',
    ],
    correct: 1,
  },
  {
    id: 13,
    category: 'Product & Design',
    question: 'In UX design, what is the primary goal of usability testing?',
    options: [
      'To finalize color schemes and typography',
      'To observe real users interacting with the product and identify pain points',
      'To generate marketing copy for the product',
      'To measure server response times',
    ],
    correct: 1,
  },
  {
    id: 14,
    category: 'Soft Skills',
    question: 'When faced with conflicting priorities from two managers, what is the most professional approach?',
    options: [
      'Complete the task from the more senior manager first without discussion',
      'Ignore one request and focus on your preferred task',
      'Communicate transparently with both managers to align on priorities',
      'Delegate both tasks to a colleague',
    ],
    correct: 2,
  },
  {
    id: 15,
    category: 'Soft Skills',
    question: 'Which communication style is most effective when presenting data findings to a non-technical audience?',
    options: [
      'Use technical jargon to demonstrate expertise',
      'Present all raw data tables without summarization',
      'Focus on actionable insights with clear visual storytelling',
      'Send a detailed written report without verbal explanation',
    ],
    correct: 2,
  },
]

export const TOTAL_TIME_SECONDS = 30 * 60 // 30 minutes

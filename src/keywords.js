// src/keywords.js
// Lightweight tech keyword extractor — local dictionary, zero API calls
// Exposes window.VisaDetector.keywords

(function (ns) {
    ns = ns || (window.VisaDetector = window.VisaDetector || {});
    ns.keywords = ns.keywords || {};

    // ~200 common tech terms grouped by category
    // Each entry: [display name, ...match variants]
    const DICTIONARY = [
        // Languages
        ['Python', 'python'],
        ['JavaScript', 'javascript', 'js'],
        ['TypeScript', 'typescript', 'ts'],
        ['Java', 'java'],
        ['C++', 'c++', 'cpp'],
        ['C#', 'c#', 'csharp', 'c sharp'],
        ['Go', 'golang', 'go lang'],
        ['Rust', 'rust'],
        ['Ruby', 'ruby'],
        ['PHP', 'php'],
        ['Swift', 'swift'],
        ['Kotlin', 'kotlin'],
        ['Scala', 'scala'],
        ['R', 'r lang'],
        ['SQL', 'sql'],
        ['Bash', 'bash', 'shell scripting'],
        ['Perl', 'perl'],
        ['Lua', 'lua'],
        ['Dart', 'dart'],
        ['Elixir', 'elixir'],
        ['Haskell', 'haskell'],
        ['Clojure', 'clojure'],
        ['Objective-C', 'objective-c', 'objc'],
        ['MATLAB', 'matlab'],
        // Frontend
        ['React', 'react', 'reactjs', 'react.js'],
        ['Angular', 'angular', 'angularjs'],
        ['Vue.js', 'vue', 'vuejs', 'vue.js'],
        ['Next.js', 'next.js', 'nextjs'],
        ['Svelte', 'svelte'],
        ['HTML', 'html', 'html5'],
        ['CSS', 'css', 'css3'],
        ['Sass', 'sass', 'scss'],
        ['Tailwind', 'tailwind', 'tailwindcss'],
        ['Bootstrap', 'bootstrap'],
        ['jQuery', 'jquery'],
        ['Redux', 'redux'],
        ['Webpack', 'webpack'],
        ['Vite', 'vite'],
        // Backend
        ['Node.js', 'node.js', 'nodejs', 'node'],
        ['Express', 'express', 'expressjs'],
        ['Django', 'django'],
        ['Flask', 'flask'],
        ['FastAPI', 'fastapi'],
        ['Spring', 'spring boot', 'spring framework', 'spring'],
        ['Rails', 'ruby on rails', 'rails'],
        ['ASP.NET', 'asp.net', '.net', 'dotnet'],
        ['Laravel', 'laravel'],
        ['NestJS', 'nestjs'],
        ['GraphQL', 'graphql'],
        ['REST', 'rest api', 'restful'],
        ['gRPC', 'grpc'],
        // Data & ML
        ['TensorFlow', 'tensorflow'],
        ['PyTorch', 'pytorch'],
        ['scikit-learn', 'scikit-learn', 'sklearn'],
        ['Pandas', 'pandas'],
        ['NumPy', 'numpy'],
        ['Spark', 'apache spark', 'pyspark', 'spark'],
        ['Hadoop', 'hadoop'],
        ['Kafka', 'kafka', 'apache kafka'],
        ['Airflow', 'airflow', 'apache airflow'],
        ['dbt', 'dbt'],
        ['Snowflake', 'snowflake'],
        ['Databricks', 'databricks'],
        ['MLflow', 'mlflow'],
        ['Hugging Face', 'hugging face', 'huggingface'],
        ['LLM', 'llm', 'large language model'],
        ['NLP', 'nlp', 'natural language processing'],
        ['Computer Vision', 'computer vision', 'cv'],
        ['Deep Learning', 'deep learning'],
        ['Machine Learning', 'machine learning', 'ml'],
        ['AI', 'artificial intelligence'],
        ['Data Engineering', 'data engineering'],
        ['ETL', 'etl'],
        // Databases
        ['PostgreSQL', 'postgresql', 'postgres'],
        ['MySQL', 'mysql'],
        ['MongoDB', 'mongodb', 'mongo'],
        ['Redis', 'redis'],
        ['Elasticsearch', 'elasticsearch', 'elastic search'],
        ['DynamoDB', 'dynamodb'],
        ['Cassandra', 'cassandra'],
        ['SQLite', 'sqlite'],
        ['Oracle', 'oracle db', 'oracle database'],
        ['SQL Server', 'sql server', 'mssql'],
        ['Neo4j', 'neo4j'],
        ['Firebase', 'firebase'],
        ['Supabase', 'supabase'],
        // Cloud & DevOps
        ['AWS', 'aws', 'amazon web services'],
        ['Azure', 'azure', 'microsoft azure'],
        ['GCP', 'gcp', 'google cloud'],
        ['Docker', 'docker'],
        ['Kubernetes', 'kubernetes', 'k8s'],
        ['Terraform', 'terraform'],
        ['Ansible', 'ansible'],
        ['Jenkins', 'jenkins'],
        ['GitHub Actions', 'github actions'],
        ['CI/CD', 'ci/cd', 'cicd'],
        ['Linux', 'linux'],
        ['Nginx', 'nginx'],
        ['Helm', 'helm'],
        ['ArgoCD', 'argocd', 'argo cd'],
        ['CloudFormation', 'cloudformation'],
        ['Pulumi', 'pulumi'],
        ['Serverless', 'serverless', 'lambda'],
        ['S3', 's3'],
        ['EC2', 'ec2'],
        ['ECS', 'ecs'],
        ['EKS', 'eks'],
        ['GKE', 'gke'],
        ['AKS', 'aks'],
        // Testing
        ['Jest', 'jest'],
        ['Cypress', 'cypress'],
        ['Selenium', 'selenium'],
        ['Playwright', 'playwright'],
        ['Pytest', 'pytest'],
        ['JUnit', 'junit'],
        ['Mocha', 'mocha'],
        // Tools & Practices
        ['Git', 'git', 'github', 'gitlab', 'bitbucket'],
        ['Jira', 'jira'],
        ['Confluence', 'confluence'],
        ['Figma', 'figma'],
        ['Agile', 'agile', 'scrum', 'kanban'],
        ['Microservices', 'microservices'],
        ['API', 'api design', 'api development'],
        ['OAuth', 'oauth', 'oauth2'],
        ['JWT', 'jwt'],
        ['WebSockets', 'websocket', 'websockets'],
        // Mobile
        ['React Native', 'react native'],
        ['Flutter', 'flutter'],
        ['iOS', 'ios development', 'ios'],
        ['Android', 'android'],
        ['SwiftUI', 'swiftui'],
        // Data Viz & BI
        ['Tableau', 'tableau'],
        ['Power BI', 'power bi', 'powerbi'],
        ['Looker', 'looker'],
        ['D3.js', 'd3', 'd3.js'],
        // Big Data / Streaming
        ['Flink', 'apache flink', 'flink'],
        ['Storm', 'apache storm'],
        ['Kinesis', 'kinesis'],
        ['Pub/Sub', 'pub/sub', 'pubsub'],
        ['RabbitMQ', 'rabbitmq'],
        ['Celery', 'celery'],
        // Security
        ['OWASP', 'owasp'],
        ['Penetration Testing', 'penetration testing', 'pen testing'],
        ['SOC 2', 'soc 2', 'soc2'],
        ['HIPAA', 'hipaa'],
        ['GDPR', 'gdpr'],
    ];

    // Precompile regexes per term for fast matching
    const compiled = DICTIONARY.map(([display, ...variants]) => ({
        display,
        regexes: variants.map(v => {
            try {
                // Word boundary match, case insensitive
                const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                return new RegExp('\\b' + escaped + '\\b', 'i');
            } catch (e) { return null; }
        }).filter(Boolean)
    }));

    /**
     * Extract tech keywords from JD text.
     * Returns deduplicated sorted array of display names.
     * @param {string} text - full job description text
     * @returns {string[]}
     */
    ns.keywords.extract = function (text) {
        if (!text || text.length < 20) return [];
        const found = [];
        const normalized = text.toLowerCase();

        for (const entry of compiled) {
            for (const rx of entry.regexes) {
                if (rx.test(normalized)) {
                    found.push(entry.display);
                    break; // one match per term is enough
                }
            }
        }

        return found;
    };

})(window.VisaDetector = window.VisaDetector || {});

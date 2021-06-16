module.exports = {
  apps : [{
    name: 'localhost',
    script: './main.js',

    watch: true,
    ignore_watch: ["logs", "node_modules"],
    node_args: ["--inspect"],

    log_date_format: "YYYY-MM-DD HH:mm:ss Z ",
    out_file: "./logs/out_file.log",
    error_file: "./logs/error_file.log",

    env: {
        "NODE_ENV": "development",
    },
    env_production : {
        "NODE_ENV": "production"
    }
  }]
};

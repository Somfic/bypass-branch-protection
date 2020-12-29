const core = require("@actions/core");
const request = require("request-promise");

// most @actions toolkit packages have async methods
async function run() {
  try {
    const backup = core.getInput("backup");
    const branch = core.getInput("branch");
    const token = core.getInput("token");
    const repository = core.getInput("repository");

    const protectionOptions = {
      url: `https://api.github.com/repos/${repository}/branches/master/protection`,
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `token ${token}`,
        "User-Agent": "bypass-branch-protection-action",
      },
    };

    let protectionUpdateOptions = {
      url: `https://api.github.com/repos/${repository}/branches/master/protection`,
      headers: {
        Accept: "application/vnd.github.luke-cage-preview+json",
        Authorization: `token ${token}`,
        "User-Agent": "bypass-branch-protection-action",
      },
      body: backup,
    };

    const protectionReviewsOptions = {
      url: `https://api.github.com/repos/${repository}/branches/master/protection/required_pull_request_reviews`,
      headers: {
        Accept: "application/vnd.github.luke-cage-preview+json",
        Authorization: `token ${token}`,
        "User-Agent": "bypass-branch-protection-action",
      },
    };

    console.log(backup);

    if (backup == "") {
      core.info(`Enabling bypass for ${branch} branch`);
      core.info("Generating backup ...");
      let protection = await request.get(protectionOptions);
      let protectionReview = await request.get(protectionReviewsOptions);

      let result = JSON.parse(protection);
      result.required_pull_request_reviews = JSON.parse(protectionReview);

      let backupJson = {};

      //required_status_checks
      if (result.required_status_checks) {
        backupJson.required_status_checks = {
          strict: result.required_status_checks.strict || false,
          contexts: result.required_status_checks.contexts || [],
        };
      } else {
        backupJson.required_status_checks = {
          strict: false,
          contexts: [],
        };
      }

      //enforce_admins
      if (result.enforce_admins) {
        backupJson.enforce_admins = result.enforce_admins.enabled || null;
      } else {
        backupJson.enforce_admins = null;
      }

      //required_pull_request_reviews
      if (result.required_pull_request_reviews) {
        backupJson.required_pull_request_reviews = {};

        if (result.required_pull_request_reviews.dismissal_restrictions) {
          backupJson.required_pull_request_reviews.dismissal_restrictions = {};
          if (
            result.required_pull_request_reviews.dismissal_restrictions.users &&
            result.required_pull_request_reviews.dismissal_restrictions.users
              .length > 0
          ) {
            backupJson.required_pull_request_reviews.dismissal_restrictions.users =
              result.required_pull_request_reviews.dismissal_restrictions.users.map(
                (x) => x.login
              ) || [];
          }

          if (
            result.required_pull_request_reviews.dismissal_restrictions.teams &&
            result.required_pull_request_reviews.dismissal_restrictions.teams
              .length > 0
          ) {
            backupJson.required_pull_request_reviews.dismissal_restrictions.teams =
              result.required_pull_request_reviews.dismissal_restrictions.users.map(
                (x) => x.slug
              ) || [];
          }
        }

        backupJson.required_pull_request_reviews.dismiss_stale_reviews =
          result.required_pull_request_reviews.dismiss_stale_reviews || false;
        backupJson.required_pull_request_reviews.require_code_owner_reviews =
          result.required_pull_request_reviews.require_code_owner_reviews ||
          false;
        backupJson.required_pull_request_reviews.required_approving_review_count =
          result.required_pull_request_reviews
            .required_approving_review_count || 1;
      } else {
        backupJson.required_pull_request_review = null;
      }

      //restrictions
      if (result.restrictions) {
        backupJson.restrictions = {};

        if (result.restrictions.users && result.restrictions.users.length > 0) {
          backupJson.restrictions.users =
            result.restrictions.users.map((x) => x.login) || [];
        } else {
          backupJson.restrictions.users = [];
        }

        if (result.restrictions.teams && result.restrictions.teams.length > 0) {
          backupJson.restrictions.teams =
            result.restrictions.teams.map((x) => x.slug) || [];
        } else {
          backupJson.restrictions.teams = [];
        }

        if (result.restrictions.apps && result.restrictions.apps.length > 0) {
          backupJson.restrictions.apps =
            result.restrictions.apps.map((x) => x.slug) || [];
        } else {
          backupJson.restrictions.apps = [];
        }
      } else {
        backupJson.restrictions = null;
      }

      //required_linear_history
      if (result.required_linear_history) {
        backupJson.required_linear_history =
          result.required_linear_history.enabled || null;
      } else {
        backupJson.required_linear_history = null;
      }

      //allow_force_pushes
      if (result.allow_force_pushes) {
        backupJson.allow_force_pushes =
          result.allow_force_pushes.enabled || null;
      } else {
        backupJson.allow_force_pushes = null;
      }

      //allow_deletions
      if (result.allow_deletions) {
        backupJson.allow_deletions = result.allow_deletions.enabled || null;
      } else {
        backupJson.allow_deletions = null;
      }

      core.debug(JSON.stringify(backupJson));
      core.setOutput("backup", JSON.stringify(backupJson));
      core.info("Generated backup");
      core.info("Modifying GitHub branch protection settings ...");
      await request.delete(protectionOptions);
      core.info("Bypass enabled");
    } else {
      core.info(`Disabling bypass for ${branch} branch`);
      core.info("Modifying GitHub branch protection settings ...");
      await request.put(protectionUpdateOptions);
      core.info("Bypass disabled");
    }
  } catch (error) {
    if (error.includes("Branch not protected")) {
      core.info("Branch is not protected, skipping");
    } else {
      core.setFailed(error.message);
    }
  }
}

run();

# About

Setting up GitHub App.

## Create a new App

Go to Organization -> Settings -> Developer Settings section -> GitHub Apps -> New GitHub App

Replace <your org> with your organization name in the link:
`https://github.com/organizations/<your org>/settings/apps`

1. Set a unique name
1. Provide a home page URL: your company URL or just `http://localhost`
1. Uncheck Webhook -> Active checkbox.
1. Set the scopes -> select **Organization permissions** -> **GitHub Copilot Business** -> select **Access: Read-only**

Set all required scopes for the app.

![scopes](img/image-scopes.png)

## Generate a private key

Create a private key - it will get downloaded to your machine.

![key](img/image-key.png)

## Install the app in the org

Install the application.

![install](img/image-org.png)

## Note the application ID

Note the ID.

![ID](img/image-id.png)

## Create repository action secrets

Create secrets for the workflow:

- `APP_ID` - ID of the application
- `PRIVATE_KEY` - private key generated in the earlier step

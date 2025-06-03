# Deploying the Workout Web App on Raspberry Pi with Apache

This guide provides instructions to deploy the Workout Web App on a Raspberry Pi running Apache web server.

## Prerequisites

1.  **Raspberry Pi:** A Raspberry Pi set up with Raspberry Pi OS (or any compatible Linux distribution).
2.  **Apache Installation:** Apache web server must be installed. If not, install it using:
    ```bash
    sudo apt update
    sudo apt install apache2 -y
    ```
3.  **Apache Configuration:**
    *   Ensure Apache is running: `sudo systemctl status apache2` (should be active).
    *   The default document root for Apache is typically `/var/www/html/`. We will deploy the app in a subdirectory within this root.

## Deployment Steps

1.  **Create Application Directory:**
    Create a directory for the web app within Apache's document root. For example:
    ```bash
    sudo mkdir /var/www/html/workout-app
    ```

2.  **Copy Application Files:**
    Copy all the necessary application files into the newly created directory:
    *   `index.html`
    *   `style.css`
    *   `script.js`
    *   `Workout Web App Template.xlsx` (ensure the filename exactly matches this, including capitalization and spacing, or update the path in `script.js`)

    You can use `scp` to copy files from your development machine to the Raspberry Pi, or transfer them via a USB drive, etc. For example, if the files are in a local `my-workout-app-files/` directory:
    ```bash
    scp -r my-workout-app-files/* pi@<RaspberryPi_IP>:/tmp/workout-app-staging
    sudo mv /tmp/workout-app-staging/* /var/www/html/workout-app/
    ```
    (Adjust paths as needed)

3.  **Set File Permissions:**
    Ensure that Apache has the necessary permissions to read the application files. The files should typically be owned by the `www-data` user and group (which Apache uses).
    ```bash
    sudo chown -R www-data:www-data /var/www/html/workout-app
    sudo chmod -R 755 /var/www/html/workout-app
    ```
    This sets the owner to `www-data` and gives read/execute permissions to the owner, group, and others, which is generally suitable for web content.

4.  **Access the Application:**
    Open a web browser on a device connected to the same network as your Raspberry Pi and navigate to:
    `http://<RaspberryPi_IP>/workout-app/`
    Replace `<RaspberryPi_IP>` with the actual IP address of your Raspberry Pi. You can find the IP address using `hostname -I` on the Raspberry Pi.

## Troubleshooting

*   **404 Not Found (for app files):**
    *   Double-check that all files (`index.html`, `style.css`, `script.js`, `Workout Web App Template.xlsx`) are correctly copied into the `/var/www/html/workout-app/` directory.
    *   Verify the URL you are using in the browser.
*   **Excel File Not Loading (App loads but no data or error fetching data):**
    *   **Path Mismatch:** Ensure the filename `Workout Web App Template.xlsx` in `/var/www/html/workout-app/` *exactly* matches the path used in the `fetch` call in `script.js` (currently `./Workout%20Web%20App%20Template.xlsx`). Note that `%20` represents a space in URLs. If your actual filename on the Pi is `Workout Web App Template.xlsx` (with spaces), Apache and the browser should handle the space encoding correctly when fetching `./Workout Web App Template.xlsx`.
    *   **Permissions:** Confirm that `Workout Web App Template.xlsx` has read permissions for the `www-data` user (covered in step 3).
    *   **Case Sensitivity:** Linux file systems are case-sensitive. `template.xlsx` is different from `Template.xlsx`.
*   **Permission Denied Errors (General):**
    *   If you see errors related to permissions in Apache logs, ensure the `chown` and `chmod` commands from step 3 were applied correctly.
*   **Checking Apache Error Logs:**
    Apache's error logs can provide valuable information for diagnosing issues. The default location is typically:
    *   `/var/log/apache2/error.log`
    You can view the log using:
    ```bash
    sudo tail -f /var/log/apache2/error.log
    ```
*   **Changes Not Reflecting:**
    *   Clear your browser cache.
    *   Ensure you've saved changes in `script.js` or other files and re-copied them to the server if necessary.
*   **`localStorage` Issues:**
    *   Remember that `localStorage` is browser-specific and domain-specific. If you access the app via `http://localhost/workout-app/` and then `http://<RaspberryPi_IP>/workout-app/`, they will have separate `localStorage` data.

By following these steps, you should be able to successfully deploy and access the Workout Web App on your Raspberry Pi.

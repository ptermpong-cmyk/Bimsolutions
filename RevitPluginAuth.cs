// ============================================================
// BiMSolutions Revit Plug-in — Auth & License Client
// Copy into your Revit Add-in project.
// Requires: NuGet package "Supabase" (2.x)
// ============================================================

using System;
using System.IO;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Supabase;
using Supabase.Gotrue;

namespace BimSolutions.Auth
{
    public static class BimsAuth
    {
        // === CONFIG: match the values in your web landing page ===
        private const string SupabaseUrl = "https://YOUR-PROJECT.supabase.co";
        private const string SupabaseAnonKey = "YOUR-ANON-PUBLIC-KEY";

        private static Client _client;
        private static readonly string TokenFile = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "BiMSolutions", "session.json"
        );

        public static async Task<Client> GetClientAsync()
        {
            if (_client != null) return _client;

            var options = new SupabaseOptions
            {
                AutoConnectRealtime = false,
                AutoRefreshToken = true,
                PersistSession = true,
                SessionHandler = new FileSessionHandler(TokenFile)
            };

            _client = new Client(SupabaseUrl, SupabaseAnonKey, options);
            await _client.InitializeAsync();
            return _client;
        }

        // === SIGN IN ===
        public static async Task<AuthResult> SignInAsync(string email, string password)
        {
            try
            {
                var client = await GetClientAsync();
                var session = await client.Auth.SignIn(email, password);
                if (session?.User != null)
                {
                    return new AuthResult { Success = true, UserId = session.User.Id, Email = session.User.Email };
                }
                return new AuthResult { Success = false, Error = "Invalid credentials" };
            }
            catch (Exception ex)
            {
                return new AuthResult { Success = false, Error = ex.Message };
            }
        }

        // === SIGN OUT ===
        public static async Task SignOutAsync()
        {
            var client = await GetClientAsync();
            await client.Auth.SignOut();
            if (File.Exists(TokenFile)) File.Delete(TokenFile);
        }

        // === IS SIGNED IN ===
        public static async Task<bool> IsSignedInAsync()
        {
            var client = await GetClientAsync();
            return client.Auth.CurrentSession != null && client.Auth.CurrentUser != null;
        }

        // === CHECK LICENSE (calls Postgres RPC) ===
        public static async Task<LicenseResult> CheckLicenseAsync()
        {
            try
            {
                var client = await GetClientAsync();
                if (client.Auth.CurrentUser == null)
                    return new LicenseResult { Valid = false, Reason = "not_signed_in" };

                var response = await client.Rpc("check_license", null);
                var content = response.Content;
                return JsonConvert.DeserializeObject<LicenseResult>(content);
            }
            catch (Exception ex)
            {
                return new LicenseResult { Valid = false, Reason = ex.Message };
            }
        }

        // === CAN USE EXTENSION (convenience) ===
        public static async Task<bool> CanUseExtensionAsync()
        {
            if (!await IsSignedInAsync()) return false;
            var license = await CheckLicenseAsync();
            return license.Valid;
        }
    }

    // === RESULT TYPES ===
    public class AuthResult
    {
        public bool Success { get; set; }
        public string UserId { get; set; }
        public string Email { get; set; }
        public string Error { get; set; }
    }

    public class LicenseResult
    {
        [JsonProperty("valid")]  public bool Valid { get; set; }
        [JsonProperty("plan")]   public string Plan { get; set; }
        [JsonProperty("reason")] public string Reason { get; set; }
        [JsonProperty("expires_at")] public DateTime? ExpiresAt { get; set; }
    }

    // === SESSION PERSISTENCE (survive Revit restart) ===
    public class FileSessionHandler : IGotrueSessionPersistence<Session>
    {
        private readonly string _filePath;
        public FileSessionHandler(string filePath)
        {
            _filePath = filePath;
            Directory.CreateDirectory(Path.GetDirectoryName(_filePath));
        }

        public void SaveSession(Session session)
        {
            File.WriteAllText(_filePath, JsonConvert.SerializeObject(session));
        }

        public void DestroySession()
        {
            if (File.Exists(_filePath)) File.Delete(_filePath);
        }

        public Session LoadSession()
        {
            if (!File.Exists(_filePath)) return null;
            try { return JsonConvert.DeserializeObject<Session>(File.ReadAllText(_filePath)); }
            catch { return null; }
        }
    }
}

// ============================================================
// USAGE IN YOUR LOGIN DIALOG:
//
// private async void LoginButton_Click(object sender, EventArgs e)
// {
//     var result = await BimsAuth.SignInAsync(EmailBox.Text, PasswordBox.Text);
//     if (result.Success)
//     {
//         var license = await BimsAuth.CheckLicenseAsync();
//         if (license.Valid)
//         {
//             MessageBox.Show($"Welcome! Plan: {license.Plan}");
//             this.Close();  // proceed into Revit
//         }
//         else
//         {
//             MessageBox.Show("No active subscription. Please request trial access at bimsolutions.co");
//         }
//     }
//     else
//     {
//         MessageBox.Show("Login failed: " + result.Error);
//     }
// }
//
// USAGE IN COMMAND BEFORE RUNNING A FEATURE:
//
// public Result Execute(ExternalCommandData commandData, ref string message, ElementSet elements)
// {
//     if (!Task.Run(() => BimsAuth.CanUseExtensionAsync()).Result)
//     {
//         TaskDialog.Show("BiMSolutions", "Please sign in with a valid subscription.");
//         return Result.Cancelled;
//     }
//     // ... your feature code ...
//     return Result.Succeeded;
// }
// ============================================================

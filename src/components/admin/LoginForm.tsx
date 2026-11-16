"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ACCOUNTS, getSession, login } from "@/lib/auth";
import { logAction } from "@/lib/adminlog";

export default function LoginForm() {
  const router = useRouter();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [show, setShow] = useState(false);
  const [bad, setBad] = useState(false);

  useEffect(() => {
    if (getSession()) router.replace("/admin");
  }, [router]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = login(u, p);
    if (!s) {
      setBad(true);
      setP("");
      return;
    }
    logAction(`${s.role} signed in`, "login");
    router.replace("/admin");
  };

  return (
    <div className="admin">
      <div className="wrap ad-login">
        <h1 className="h2">Staff sign in</h1>
        <p className="muted">Torre de Jardin · owners' and managers' desk</p>
        <form onSubmit={submit}>
          <label>
            <span className="label">Username</span>
            <input value={u} autoComplete="username" autoCapitalize="none" autoFocus onChange={(e) => { setU(e.target.value); setBad(false); }} />
          </label>
          <label>
            <span className="label">Password</span>
            <span className="voucher-row">
              <input type={show ? "text" : "password"} value={p} autoComplete="current-password" onChange={(e) => { setP(e.target.value); setBad(false); }} />
              <button type="button" className="btn" onClick={() => setShow(!show)}>
                <span>{show ? "Hide" : "Show"}</span>
              </button>
            </span>
          </label>
          {bad && <p className="ad-err">Wrong username or password.</p>}
          <div className="row">
            <button className="btn btn-solid" type="submit">
              <span>Sign in</span>
            </button>
            <Link className="btn" href="/">
              <span>Back to site</span>
            </Link>
          </div>
        </form>

        <div className="ad-demo">
          <span className="label">Demo accounts</span>
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Username</th>
                <th>Password</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ACCOUNTS.map((a) => (
                <tr key={a.username}>
                  <td>{a.role}</td>
                  <td>
                    <code>{a.username}</code>
                  </td>
                  <td>
                    <code>{a.password}</code>
                  </td>
                  <td>
                    <button type="button" className="link small" onClick={() => { setU(a.username); setP(a.password); setBad(false); }}>
                      <span>Fill in</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted small">Demo only. The live site will use real private accounts.</p>
        </div>
      </div>
    </div>
  );
}

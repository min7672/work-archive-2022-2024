using System.Diagnostics;

namespace ConsoleApplication47
{

    //==========================================================
    // ShellTool : PowerShell 및 CMD 명령 실행 유틸리티 클래스
    //==========================================================
    class ShellTool
    {
        Process process_memory;
        string resultValue;
        int start;
        int end;
        public ShellTool()
        {
            process_memory = new Process();
            resultValue = "";
            start = 0;
            end = 0;
        }
        public void openPowerShell(string _command)
        {
            process_memory.StartInfo.FileName = @"powershell.exe";
            process_memory.StartInfo.CreateNoWindow = true;
            process_memory.StartInfo.UseShellExecute = false;
            process_memory.StartInfo.WindowStyle = ProcessWindowStyle.Hidden;
            process_memory.StartInfo.RedirectStandardInput = true;
            process_memory.StartInfo.RedirectStandardOutput = true;
            process_memory.Start();
            process_memory.StandardInput.Write(_command + Environment.NewLine);
            process_memory.StandardInput.Close();
            process_memory.WaitForExit();
            process_memory.Close();

        }

        public string openCMD(string _command)
        {

            process_memory.StartInfo.FileName = @"cmd.exe";
            process_memory.StartInfo.CreateNoWindow = true;
            process_memory.StartInfo.UseShellExecute = false;
            process_memory.StartInfo.RedirectStandardInput = true;
            process_memory.StartInfo.RedirectStandardOutput = true;
            process_memory.Start();
            process_memory.StandardInput.Write(_command + Environment.NewLine);
            process_memory.StandardInput.Close();
            resultValue = process_memory.StandardOutput.ReadToEnd();
            start = resultValue.IndexOf(_command) + _command.Length;
            end = resultValue.LastIndexOf("C:\\") - start;
            resultValue = resultValue.Substring(start, end).Trim();

            process_memory.WaitForExit();
            process_memory.Close();

            return resultValue == "" ? "" : resultValue;
        }

    }

    //==========================================================
    // PersistentKitty : kitty 세션 모니터링 및 자동 재실행 관리 클래스
    //==========================================================
    class PersistentKitty
    {

        // 내부 버퍼/임시 컨테이너
        string str_container;
        string[] str_arr_container;

        List<string> list_container;
        List<string[]> list_str_arr_container;

        // 공용 리소스
        ShellTool tool;
        string workingDir;

        List<string> current_pid;
        List<string> total_session;
        Dictionary<string, string> current_task;



        //==========================================================
        // 생성자
        //==========================================================
        public PersistentKitty(string _workDir)
        {
            tool = new ShellTool();
            str_arr_container = new string[0];
            list_container = new List<string>();
            str_container = "";
            list_str_arr_container = new List<string[]>();
            current_task = new Dictionary<string, string>();
            workingDir = _workDir;
            current_pid = new List<string>();
            total_session = new List<string>();
        }

        // kitty 프로세스 실행
        private void openKitty(string _fileName, string _sessionName)
        {
            //"Start-Process -WindowStyle hidden -FilePath {0}{1} -argument \"-load {2}\""
            tool.openPowerShell(string.Format("Start-Process -WindowStyle hidden -FilePath {0}{1} -argument \"-load {2}\"", workingDir, _fileName, _sessionName));
            Thread.Sleep(3000);
        }

        // 지정 파일 존재 여부 확인
        private Boolean checkfile(string _fileName)
        {
            str_arr_container = Directory.GetFiles(workingDir);

            for (int i = 0; i < str_arr_container.Length; i++)
            {
                str_arr_container[i] = (str_arr_container[i].Replace(string.Format("{0}", workingDir), ""));

                if (str_arr_container[i] == _fileName)
                {
                    return true;
                }

            }
            return false;
        }

        // 텍스트 파일 읽기 (라인 단위)
        private List<string> readLineText(string _filename)
        {

            if (!Directory.Exists(workingDir)) { Directory.CreateDirectory(workingDir); }
            if (checkfile(_filename))
            {
                if (list_container.Count > 0) { list_container.Clear(); }
                foreach (string line in System.IO.File.ReadLines(string.Format("{0}{1}", workingDir, _filename)))
                {
                    list_container.Add(line);
                }
                return list_container;
            }
            else { return new List<string>(); }
        }

        // 프로세스 종료
        private void taskkill(string task_identifier, params string[] _args)
        {
            if (_args.Length == 0)
            {
                tool.openPowerShell(string.Format("taskkill /f /im {0}", task_identifier));
            }
            else
            {
                List<string> args = _args.ToList();

                string tmp = "";
                str_arr_container = tool.openCMD(string.Format("tasklist |findstr {0}", task_identifier)).Split("\n");
                if (str_arr_container.Length > 0)
                {
                    foreach (var word in str_arr_container)
                    {
                        if (word.Contains(task_identifier))
                        {

                            tmp = word;

                            try
                            {
                                tmp = tmp.Replace("  ", " ");
                                tmp = tmp.Replace("  ", " ");
                                tmp = tmp.Replace("  ", " ");
                                tmp = tmp.Replace("  ", " ");
                                tmp = tmp.Replace("  ", " ");                       

                            }
                            catch
                            {
                            }
                            finally
                            {
                                tmp = tmp.Trim();

                            }
                            tmp = tmp.Split(" ")[1];
                            if (!args.Contains(tmp))
                            {
                                tool.openPowerShell(string.Format("taskkill /f /im {0}", tmp));
                            }

                        }
                    }
                }
            }
        }

        // netstat 기반 연결 상태 확인
        private List<string[]> checkConnection(string _ipAdress, string _fileName)
        {
            string[] statuses = { "SYN_SENT", "ESTABLISHED" };

            string tmp = "";
            string[] tmp_str;
            List<string[]> tmp_list = new List<string[]>();

            foreach (var status in statuses)
            {
                str_arr_container = tool.openCMD(String.Format("netstat -ano -p tcp |findstr {0}|findstr {1}", _ipAdress, status)).Split("\n");
                if (str_arr_container.Length > 0)
                {
                    foreach (var word in str_arr_container)
                    {
                        tmp = word;
                        if (word.Contains(_ipAdress))
                        {

                            try
                            {
                                tmp = tmp.Replace("  ", " ");
                                tmp = tmp.Replace("  ", " ");
                                tmp = tmp.Replace("  ", " ");
                                tmp = tmp.Replace("  ", " ");
                                tmp = tmp.Replace("  ", " ");                       

                            }
                            catch
                            {
                            }
                            finally
                            {
                                tmp = tmp.Trim();
                            }

                            tmp_str = tmp.Split(" ");

                            str_container = "";

                            str_container = tool.openCMD(string.Format("tasklist |findstr {0}|findstr {1}", tmp_str[4], _fileName));

                            if (str_container.IndexOf(tmp_str[4]) > 0)
                            {
                                tmp_list.Add(tmp_str);
                            }

                        }
                    }
                }
            }


            return tmp_list;
        }

        // PID 조회
        private string getPID(string _fileName, string _ipAdress)
        {

            str_arr_container = tool.openCMD(string.Format("tasklist |findstr {0}", _fileName)).Split("\n");
            string tmp = "";
            if (str_arr_container.Length > 0)
            {
                foreach (var word in str_arr_container)
                {

                    if (word.Contains(_fileName))
                    {

                        tmp = word;

                        try
                        {
                            tmp = tmp.Replace("  ", " ");
                            tmp = tmp.Replace("  ", " ");
                            tmp = tmp.Replace("  ", " ");
                            tmp = tmp.Replace("  ", " ");
                            tmp = tmp.Replace("  ", " ");                       

                        }
                        catch
                        {
                        }
                        finally
                        {
                            tmp = tmp.Trim();

                        }
                        tmp = tmp.Split(" ")[1];
                        str_container = "";
                        str_container = tool.openCMD(string.Format("netstat -ano -p tcp |findstr {0}|findstr {1}", tmp, _ipAdress));

                        if (str_container.IndexOf(_ipAdress) > 0)
                        {
                            return tmp;
                        }

                    }
                }
            }
            return "";

        }

        // 연결이 끊어진 세션 목록 반환
        private List<string> getRemoveList()
        {
            List<string> removList = new List<string>();

            string result = "";
            if (current_task.Count > 0)
            {

                foreach (var _dic in current_task)
                {
                    if (list_container.Count > 0) { list_container.Clear(); }
                    list_container = readLineText(_dic.Value);

                    
                    result = tool.openCMD(string.Format("netstat -ano -p tcp |findstr {0}|findstr {1}", _dic.Key, list_container[2]));
                    
                    if (result.IndexOf("SYN_SENT") > 0 || result.IndexOf("ESTABLISHED") > 0)
                    {
                        continue;
                    }
                    else
                    {
                        removList.Add(_dic.Key);
                    }


                }
            }
            return removList;
        }

        // 전체 세션 목록 설정
        public void setTotal_session(List<string> _session)
        {
            total_session = _session;
        }

        // 세션 실행
        public void oepnSession(string _dataFileName)
        {

            if (list_container.Count > 0) { list_container.Clear(); }
            list_container = readLineText(_dataFileName);

            string _kittyFileName = list_container[0];
            string _kittySessionName = list_container[1];
            string _hostIP = list_container[2];


            taskkill(_kittyFileName, current_pid.ToArray());

            if (total_session.Count > current_task.Count && (!current_task.ContainsValue(_dataFileName)))
            {

                openKitty(_kittyFileName, _kittySessionName);
                str_container = getPID(_kittyFileName, _hostIP);
                current_task[str_container] = _dataFileName;
                current_pid.Add(str_container);
            }

        }

        // 세션 모니터링 루프
        public void monitorSession()
        {
            List<string> remove_list = new List<string>();
            string _kittyFileName = "";
            string _kittySessionName = "";
            string _hostIP = "";

            while (true)
            {
                if (remove_list.Count > 0) { remove_list.Clear(); }

                foreach (string _fileName in total_session)
                {
                    if (list_container.Count > 0) { list_container.Clear(); }

                    list_container = readLineText(_fileName);
                    _kittyFileName = list_container[0];
                    _kittySessionName = list_container[1];
                    _hostIP = list_container[2];

                    // 연결 없음
                    if (checkConnection(_hostIP, _kittyFileName).Count == 0)
                    {
                        remove_list = getRemoveList();

                        // 연결이 끊긴 PID 정리
                        foreach (string rPid in remove_list)
                        {
                            current_pid.Remove(rPid);
                            current_task.Remove(rPid);
                        }

                        oepnSession(_fileName);
                    }
                }

                Thread.Sleep(3000);
            }
        }
    }

    //==========================================================
    // Program : 엔트리 포인트
    //==========================================================
    class Program
    {
        static void Main(string[] args)
        {
            string work_dir = @"C:\turnneling_workspace\";
            PersistentKitty run = new PersistentKitty(work_dir);

            List<string> sessionList = new List<string>();
            // 세션 작업 디렉토리 확인
            if (!Directory.Exists(work_dir))
            {
                DirectoryInfo di = Directory.CreateDirectory(work_dir);
            }

            // 세션 파일 검색
            string[] files = Directory.GetFiles(work_dir);

            for (int i = 0; i < files.Length; i++)
            {
                string tmp = files[i].Replace(work_dir, "");
                if (tmp.IndexOf("input_data") >= 0)
                {
                    sessionList.Add(tmp);
                }
            }
            run.setTotal_session(sessionList);

            // 세션 실행
            for (int i = 0; i < sessionList.Count; i++)
            {
                run.oepnSession(sessionList[i]);
            }

            // 모니터링 시작
            run.monitorSession();
        }
    }
}

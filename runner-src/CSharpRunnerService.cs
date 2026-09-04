using System.Reflection;
using System.Reflection.Metadata;
using System.Runtime.Loader;
using System.Text;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.JSInterop;

namespace CSharpRunner;

public static class CSharpRunnerService
{
    // Force these BCL assemblies to be loaded so they show up in
    // AssemblyLoadContext.Default.Assemblies below, even if nothing else
    // in this app has touched them yet.
    private static readonly Type[] Touch =
    {
        typeof(object),                                  // System.Private.CoreLib
        typeof(Console),                                  // System.Console
        typeof(System.Linq.Enumerable),                   // System.Linq
        typeof(System.Text.StringBuilder),                // (usually CoreLib)
        typeof(System.Threading.Thread),                  // System.Threading.Thread
        typeof(System.Text.RegularExpressions.Regex),     // System.Text.RegularExpressions
        typeof(System.Collections.ObjectModel.Collection<>), // System.ObjectModel
    };

    private static List<MetadataReference>? _refsCache;

    private static unsafe MetadataReference? ToMetadataReference(Assembly assembly)
    {
        if (assembly.IsDynamic) return null;
        if (!assembly.TryGetRawMetadata(out byte* blob, out int length)) return null;
        var moduleMetadata = ModuleMetadata.CreateFromMetadata((IntPtr)blob, length);
        var assemblyMetadata = AssemblyMetadata.Create(moduleMetadata);
        return assemblyMetadata.GetReference();
    }

    private static List<MetadataReference> GetReferences()
    {
        if (_refsCache is not null) return _refsCache;

        GC.KeepAlive(Touch);

        var refs = new List<MetadataReference>();
        foreach (var asm in AssemblyLoadContext.Default.Assemblies)
        {
            var r = ToMetadataReference(asm);
            if (r is not null) refs.Add(r);
        }
        _refsCache = refs;
        return refs;
    }

    [JSInvokable]
    public static async Task<string> RunAsync(string code)
    {
        var output = new StringWriter();
        var originalOut = Console.Out;

        try
        {
            var parseOptions = new CSharpParseOptions(LanguageVersion.Latest, DocumentationMode.None, SourceCodeKind.Regular);
            var tree = CSharpSyntaxTree.ParseText(code, parseOptions);

            // Mirrors the GlobalUsings.g.cs that "dotnet new console" generates when
            // <ImplicitUsings>enable</ImplicitUsings> is set, so snippets that assume
            // System/System.Linq etc. are already in scope behave the same here.
            const string implicitUsings =
                "global using global::System;\n" +
                "global using global::System.Collections.Generic;\n" +
                "global using global::System.IO;\n" +
                "global using global::System.Linq;\n" +
                "global using global::System.Text;\n" +
                "global using global::System.Threading.Tasks;\n";
            var usingsTree = CSharpSyntaxTree.ParseText(implicitUsings, parseOptions);

            var options = new CSharpCompilationOptions(
                OutputKind.ConsoleApplication,
                optimizationLevel: OptimizationLevel.Release,
                nullableContextOptions: NullableContextOptions.Enable);

            var compilation = CSharpCompilation.Create(
                "UserSnippet_" + Guid.NewGuid().ToString("N"),
                new[] { tree, usingsTree },
                GetReferences(),
                options);

            using var peStream = new MemoryStream();
            var emitResult = compilation.Emit(peStream);

            if (!emitResult.Success)
            {
                var sb = new StringBuilder();
                foreach (var diag in emitResult.Diagnostics)
                {
                    if (diag.Severity == DiagnosticSeverity.Error)
                    {
                        sb.AppendLine(diag.ToString());
                    }
                }
                return sb.Length > 0 ? sb.ToString() : "เกิดข้อผิดพลาดตอนคอมไพล์ แต่ไม่มีรายละเอียด";
            }

            peStream.Seek(0, SeekOrigin.Begin);

            var alc = new AssemblyLoadContext("snippet-" + Guid.NewGuid().ToString("N"), isCollectible: true);
            try
            {
                var asm = alc.LoadFromStream(peStream);
                var entry = asm.EntryPoint;
                if (entry is null)
                {
                    return "ไม่พบจุดเริ่มต้นโปรแกรม (entry point)";
                }

                Console.SetOut(output);

                object?[]? args = entry.GetParameters().Length > 0
                    ? new object?[] { Array.Empty<string>() }
                    : null;

                object? ret;
                try
                {
                    ret = entry.Invoke(null, args);
                }
                catch (TargetInvocationException tie) when (tie.InnerException is not null)
                {
                    throw tie.InnerException;
                }

                if (ret is Task t)
                {
                    await t;
                }

                return output.ToString();
            }
            finally
            {
                Console.SetOut(originalOut);
                alc.Unload();
            }
        }
        catch (Exception ex)
        {
            Console.SetOut(originalOut);
            var partial = output.ToString();
            return partial + $"\nUnhandled exception. {ex.GetType().FullName}: {ex.Message}";
        }
    }
}
